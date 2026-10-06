import "server-only";

import { cookies } from "next/headers";
import {
  readPrivateJson,
  writePrivateJson,
} from "@/lib/storefront-admin-store";
import {
  brandedEmailShell,
  sendTransactionalEmail,
  transactionalEmailReadiness,
} from "@/lib/email-delivery";
import { siteConfig } from "@/lib/site";

export const CUSTOMER_SESSION_COOKIE = "aloyri_customer_session";
const MAGIC_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CustomerEmailPreferences = {
  postDelivery: boolean;
  reviewRequest: boolean;
  reorderReminder: boolean;
};

const defaultEmailPreferences: CustomerEmailPreferences = {
  postDelivery: false,
  reviewRequest: false,
  reorderReminder: false,
};

type CustomerAccount = {
  version: 1;
  id: string;
  email: string;
  emailHash: string;
  displayName: string;
  savedProductIds: string[];
  emailPreferences?: CustomerEmailPreferences;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

type EmailIndex = {
  version: 1;
  accountId: string;
};

type MagicToken = {
  version: 1;
  email: string;
  emailHash: string;
  nextPath: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

type CustomerSessionRecord = {
  version: 1;
  accountId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
};

export type PublicCustomerAccount = Pick<
  CustomerAccount,
  "id" | "email" | "displayName" | "savedProductIds" | "createdAt" | "updatedAt" | "lastLoginAt"
> & {
  emailPreferences: CustomerEmailPreferences;
};

const ACCOUNT_PREFIX = "customer-auth/accounts/";
const EMAIL_PREFIX = "customer-auth/email/";
const MAGIC_PREFIX = "customer-auth/magic/";
const SESSION_PREFIX = "customer-auth/sessions/";

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeNextPath(value: string | undefined) {
  const path = (value || "/account").trim();
  return path.startsWith("/") &&
    !path.startsWith("//") &&
    path.length <= 240
    ? path
    : "/account";
}

function safeIds(values: unknown) {
  if (!Array.isArray(values)) return [] as string[];
  return [...new Set(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)),
  )].slice(0, 100);
}

function publicAccount(account: CustomerAccount): PublicCustomerAccount {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    savedProductIds: account.savedProductIds || [],
    emailPreferences: {
      ...defaultEmailPreferences,
      ...(account.emailPreferences || {}),
    },
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    ...(account.lastLoginAt ? { lastLoginAt: account.lastLoginAt } : {}),
  };
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes)
    .toString("base64url");
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}

async function emailHash(email: string) {
  return hash("aloyri-customer-email-v1:" + email);
}

export function customerAuthReadiness() {
  const email = transactionalEmailReadiness();
  const switchEnabled = process.env.ALOYRI_CUSTOMER_AUTH_ENABLED === "1";
  return {
    enabled: email.ready && switchEnabled,
    switchEnabled,
    domainReady: email.domainReady,
    senderReady: email.senderReady,
  };
}

async function accountByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const hashed = await emailHash(normalized);
  const index = await readPrivateJson<EmailIndex>(
    EMAIL_PREFIX + hashed + ".json",
  );
  if (!index?.accountId) return null;
  return readPrivateJson<CustomerAccount>(
    ACCOUNT_PREFIX + index.accountId + ".json",
  );
}

async function accountById(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  return readPrivateJson<CustomerAccount>(ACCOUNT_PREFIX + id + ".json");
}

async function ensureAccount(email: string) {
  const existing = await accountByEmail(email);
  if (existing) return existing;

  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("INVALID_EMAIL");
  const hashed = await emailHash(normalized);
  const now = new Date().toISOString();
  const account: CustomerAccount = {
    version: 1,
    id: crypto.randomUUID().replace(/-/g, ""),
    email: normalized,
    emailHash: hashed,
    displayName: "",
    savedProductIds: [],
    emailPreferences: { ...defaultEmailPreferences },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await Promise.all([
    writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account),
    writePrivateJson(EMAIL_PREFIX + hashed + ".json", {
      version: 1,
      accountId: account.id,
    } satisfies EmailIndex),
  ]);
  return account;
}

export async function requestCustomerMagicLink(
  email: string,
  nextPath?: string,
) {
  if (!customerAuthReadiness().enabled) {
    throw new Error("AUTH_NOT_READY");
  }

  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("INVALID_EMAIL");
  const rawToken = randomToken();
  const tokenHash = await hash(rawToken);
  const now = Date.now();
  const record: MagicToken = {
    version: 1,
    email: normalized,
    emailHash: await emailHash(normalized),
    nextPath: safeNextPath(nextPath),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + MAGIC_TTL_MS).toISOString(),
  };
  await writePrivateJson(MAGIC_PREFIX + tokenHash + ".json", record);

  const verifyUrl =
    siteConfig.url +
    "/api/customer-auth/verify?token=" +
    encodeURIComponent(rawToken);
  const sent = await sendTransactionalEmail({
    to: normalized,
    subject: "Your secure Aloyri sign-in link",
    html: brandedEmailShell({
      eyebrow: "Secure customer account",
      title: "Sign in to Aloyri",
      copy:
        "Use this one-time link to sign in securely. The link expires in 15 minutes and can only be used once.",
      ctaLabel: "Sign in securely",
      ctaHref: verifyUrl,
      footer:
        "If you did not request this link, you can safely ignore this email.",
    }),
    text:
      "Sign in to Aloyri: " +
      verifyUrl +
      "\n\nThis one-time link expires in 15 minutes.",
  });

  if (!sent.ok) throw new Error(sent.code);
  return { sent: true as const };
}

export async function consumeCustomerMagicLink(token: string) {
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) {
    throw new Error("INVALID_TOKEN");
  }
  const tokenHash = await hash(token);
  const path = MAGIC_PREFIX + tokenHash + ".json";
  const record = await readPrivateJson<MagicToken>(path);
  if (
    !record ||
    record.usedAt ||
    Date.parse(record.expiresAt) <= Date.now()
  ) {
    throw new Error("INVALID_TOKEN");
  }

  const account = await ensureAccount(record.email);
  const now = new Date().toISOString();
  const sessionToken = randomToken();
  const sessionHash = await hash(sessionToken);
  const session: CustomerSessionRecord = {
    version: 1,
    accountId: account.id,
    createdAt: now,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  account.lastLoginAt = now;
  account.updatedAt = now;

  await Promise.all([
    writePrivateJson(path, { ...record, usedAt: now } satisfies MagicToken),
    writePrivateJson(SESSION_PREFIX + sessionHash + ".json", session),
    writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account),
  ]);

  return {
    sessionToken,
    nextPath: safeNextPath(record.nextPath),
    account: publicAccount(account),
  };
}

export async function currentCustomerSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value || "";
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(raw)) return null;
  const sessionHash = await hash(raw);
  const session = await readPrivateJson<CustomerSessionRecord>(
    SESSION_PREFIX + sessionHash + ".json",
  );
  if (
    !session ||
    session.revokedAt ||
    Date.parse(session.expiresAt) <= Date.now()
  ) {
    return null;
  }
  const account = await accountById(session.accountId);
  if (!account) return null;
  return {
    token: raw,
    sessionHash,
    session,
    account: publicAccount(account),
  };
}

export async function revokeCurrentCustomerSession() {
  const current = await currentCustomerSession();
  if (!current) return;
  await writePrivateJson(
    SESSION_PREFIX + current.sessionHash + ".json",
    {
      ...current.session,
      revokedAt: new Date().toISOString(),
    } satisfies CustomerSessionRecord,
  );
}

export async function customerEmailPreferencesForEmail(email: string) {
  const account = await accountByEmail(email);
  return account
    ? {
        ...defaultEmailPreferences,
        ...(account.emailPreferences || {}),
      }
    : { ...defaultEmailPreferences };
}

export async function updateCurrentCustomerAccount(input: {
  displayName?: string;
  savedProductIds?: unknown;
  emailPreferences?: Partial<CustomerEmailPreferences>;
}) {
  const current = await currentCustomerSession();
  if (!current) throw new Error("UNAUTHENTICATED");
  const stored = await accountById(current.account.id);
  if (!stored) throw new Error("UNAUTHENTICATED");

  if (typeof input.displayName === "string") {
    stored.displayName = input.displayName
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);
  }
  if (input.savedProductIds !== undefined) {
    stored.savedProductIds = safeIds(input.savedProductIds);
  }
  if (input.emailPreferences) {
    stored.emailPreferences = {
      ...defaultEmailPreferences,
      ...(stored.emailPreferences || {}),
      ...(typeof input.emailPreferences.postDelivery === "boolean"
        ? { postDelivery: input.emailPreferences.postDelivery }
        : {}),
      ...(typeof input.emailPreferences.reviewRequest === "boolean"
        ? { reviewRequest: input.emailPreferences.reviewRequest }
        : {}),
      ...(typeof input.emailPreferences.reorderReminder === "boolean"
        ? { reorderReminder: input.emailPreferences.reorderReminder }
        : {}),
    };
  }
  stored.updatedAt = new Date().toISOString();
  await writePrivateJson(ACCOUNT_PREFIX + stored.id + ".json", stored);
  return publicAccount(stored);
}
