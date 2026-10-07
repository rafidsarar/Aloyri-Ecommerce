import { withRecordRetry } from "@/lib/structured-record-store";
import "server-only";

import { cookies } from "next/headers";
import {
  createPrivateJsonOnce,
  listPrivateJsonRecords,
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

export type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  district: string;
  area: string;
  address: string;
  landmark?: string;
};

export type CustomerOrderRef = {
  orderNumber: string;
  phone: string;
  createdAt: string;
  total?: number;
};

type CustomerAccount = {
  version: 1;
  id: string;
  email: string;
  emailHash: string;
  displayName: string;
  savedProductIds: string[];
  savedAddresses?: CustomerAddress[];
  orderRefs?: CustomerOrderRef[];
  emailPreferences?: CustomerEmailPreferences;
  googleIdentity?: {
    supabaseUserId: string;
    linkedAt: string;
  };
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
  method?: "email-link" | "google";
};

export type PublicCustomerAccount = Pick<
  CustomerAccount,
  "id" | "email" | "displayName" | "savedProductIds" | "createdAt" | "updatedAt" | "lastLoginAt"
> & {
  savedAddresses: CustomerAddress[];
  orderRefs: CustomerOrderRef[];
  emailPreferences: CustomerEmailPreferences;
};

const ACCOUNT_PREFIX = "customer-auth/accounts/";
const EMAIL_PREFIX = "customer-auth/email/";
const MAGIC_PREFIX = "customer-auth/magic/";
const MAGIC_CLAIM_PREFIX = "customer-auth/magic-claims/";
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

function cleanAddressText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

function safeAddresses(value: unknown) {
  if (!Array.isArray(value)) return [] as CustomerAddress[];
  const output: CustomerAddress[] = [];
  for (const raw of value.slice(0, 5)) {
    if (!raw || typeof raw !== "object") continue;
    const input = raw as Record<string, unknown>;
    const id =
      typeof input.id === "string" &&
      /^[A-Za-z0-9_-]{8,80}$/.test(input.id)
        ? input.id
        : crypto.randomUUID().replace(/-/g, "");
    const recipientName = cleanAddressText(input.recipientName, 120);
    const phone = cleanAddressText(input.phone, 30).replace(/[\s-]/g, "");
    const district = cleanAddressText(input.district, 80);
    const area = cleanAddressText(input.area, 160);
    const address = cleanAddressText(input.address, 500);
    if (
      recipientName.length < 2 ||
      !/^\+?\d{10,15}$/.test(phone) ||
      district.length < 2 ||
      area.length < 2 ||
      address.length < 8
    ) {
      continue;
    }
    output.push({
      id,
      label: cleanAddressText(input.label, 40) || "Delivery address",
      recipientName,
      phone,
      district,
      area,
      address,
      ...(cleanAddressText(input.landmark, 200)
        ? { landmark: cleanAddressText(input.landmark, 200) }
        : {}),
    });
  }
  return output;
}

function safeOrderRefs(value: unknown) {
  if (!Array.isArray(value)) return [] as CustomerOrderRef[];
  const seen = new Set<string>();
  return value
    .filter((raw): raw is Record<string, unknown> => Boolean(raw) && typeof raw === "object")
    .map((raw) => {
      const orderNumber =
        typeof raw.orderNumber === "string"
          ? raw.orderNumber.trim().toUpperCase()
          : "";
      const phone =
        typeof raw.phone === "string"
          ? raw.phone.trim().replace(/[\s-]/g, "")
          : "";
      const createdAt =
        typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt))
          ? new Date(raw.createdAt).toISOString()
          : new Date().toISOString();
      const total =
        typeof raw.total === "number" && Number.isFinite(raw.total) && raw.total >= 0
          ? Math.round(raw.total * 100) / 100
          : undefined;
      if (
        !/^WEB-[A-Z0-9-]{8,90}$/.test(orderNumber) ||
        !/^\+?\d{10,15}$/.test(phone) ||
        seen.has(orderNumber)
      ) {
        return null;
      }
      seen.add(orderNumber);
      return { orderNumber, phone, createdAt, ...(total !== undefined ? { total } : {}) };
    })
    .filter((row): row is CustomerOrderRef => Boolean(row))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function publicAccount(account: CustomerAccount): PublicCustomerAccount {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    savedProductIds: account.savedProductIds || [],
    savedAddresses: safeAddresses(account.savedAddresses || []),
    orderRefs: safeOrderRefs(account.orderRefs || []),
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
  const emailLinkEnabled = false;
  const googleConfigured = Boolean(
    process.env.SUPABASE_AUTH_URL &&
      process.env.SUPABASE_AUTH_PUBLISHABLE_KEY,
  );
  const googleSwitchEnabled =
    process.env.ALOYRI_GOOGLE_AUTH_ENABLED === "1";
  const googleEnabled = googleConfigured && googleSwitchEnabled;
  return {
    enabled: googleEnabled,
    switchEnabled,
    domainReady: email.domainReady,
    senderReady: email.senderReady,
    emailLinkEnabled,
    googleConfigured,
    googleSwitchEnabled,
    googleEnabled,
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

  await writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account);
  const claimed = await createPrivateJsonOnce(EMAIL_PREFIX + hashed + ".json", {
    version: 1,
    accountId: account.id,
  } satisfies EmailIndex);
  if (claimed) return account;

  const winner = await accountByEmail(normalized);
  if (!winner) throw new Error("ACCOUNT_CREATE_CONFLICT");
  return winner;
}

export async function requestCustomerMagicLink(
  email: string,
  nextPath?: string,
) {
  if (!customerAuthReadiness().emailLinkEnabled) {
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
  if (!customerAuthReadiness().emailLinkEnabled) throw new Error("EMAIL_LINK_DISABLED");
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

  const claimed = await createPrivateJsonOnce(
    MAGIC_CLAIM_PREFIX + tokenHash + ".json",
    {
      version: 1,
      claimedAt: new Date().toISOString(),
    },
  );
  if (!claimed) throw new Error("INVALID_TOKEN");

  const account = await ensureAccount(record.email);
  const now = new Date().toISOString();
  const sessionToken = randomToken();
  const sessionHash = await hash(sessionToken);
  const session: CustomerSessionRecord = {
    version: 1,
    accountId: account.id,
    createdAt: now,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    method: "email-link",
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
  savedAddresses?: unknown;
}) {
  return withRecordRetry(async () => {

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
  if (input.savedAddresses !== undefined) {
    stored.savedAddresses = safeAddresses(input.savedAddresses);
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

  });
}


export async function recordCurrentCustomerOrder(input: {
  email?: string;
  orderNumber: string;
  phone: string;
  createdAt?: string;
  total?: number;
}) {
  const current = await currentCustomerSession();
  if (!current || !input.email) return false;
  const email = normalizeEmail(input.email);
  if (!email || email !== current.account.email) return false;
  return claimCurrentCustomerOrder(input);
}

export async function claimCurrentCustomerOrder(input: {
  orderNumber: string;
  phone: string;
  createdAt?: string;
  total?: number;
}) {
  return withRecordRetry(async () => {

  const current = await currentCustomerSession();
  if (!current) throw new Error("UNAUTHENTICATED");
  return recordCustomerOrderForAccount(current.account.id, { ...input, createdAt: input.createdAt || new Date().toISOString() });
  });
}

export async function recordCustomerOrderForAccount(accountId: string, input: CustomerOrderRef) {
  return withRecordRetry(async () => {
  const stored = await accountById(accountId);
  if (!stored) throw new Error("ACCOUNT_NOT_FOUND");
  stored.orderRefs = safeOrderRefs([input, ...(stored.orderRefs || [])]);
  stored.updatedAt = new Date().toISOString();
  await writePrivateJson(ACCOUNT_PREFIX + stored.id + ".json", stored);
  return publicAccount(stored);
  });
}

export async function customerSecuritySummary() {
  const current = await currentCustomerSession();
  if (!current) throw new Error("UNAUTHENTICATED");
  const rows = await listPrivateJsonRecords<CustomerSessionRecord>(
    SESSION_PREFIX,
    250,
  );
  const now = Date.now();
  const active = rows
    .filter(
      (row) =>
        row.value.accountId === current.account.id &&
        !row.value.revokedAt &&
        Date.parse(row.value.expiresAt) > now,
    )
    .sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt));
  return {
    activeSessions: active.length,
    currentSessionCreatedAt: current.session.createdAt,
    currentSessionExpiresAt: current.session.expiresAt,
  };
}

export async function revokeOtherCustomerSessions() {
  const current = await currentCustomerSession();
  if (!current) throw new Error("UNAUTHENTICATED");
  const rows = await listPrivateJsonRecords<CustomerSessionRecord>(
    SESSION_PREFIX,
    250,
  );
  const now = new Date().toISOString();
  let revoked = 0;
  for (const row of rows) {
    if (
      row.value.accountId !== current.account.id ||
      row.value.revokedAt ||
      row.pathname === SESSION_PREFIX + current.sessionHash + ".json"
    ) {
      continue;
    }
    await writePrivateJson(row.pathname, { ...row.value, revokedAt: now });
    revoked += 1;
  }
  return { revoked };
}


export async function createCustomerSessionFromGoogleIdentity(input: {
  supabaseUserId: string;
  email: string;
  displayName?: string;
}) {
  return withRecordRetry(async () => {

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.supabaseUserId,
    )
  ) {
    throw new Error("INVALID_GOOGLE_IDENTITY");
  }

  const email = normalizeEmail(input.email);
  if (!email) throw new Error("INVALID_EMAIL");

  const account = await ensureAccount(email);
  if (
    account.googleIdentity?.supabaseUserId &&
    account.googleIdentity.supabaseUserId !== input.supabaseUserId
  ) {
    throw new Error("GOOGLE_IDENTITY_CONFLICT");
  }

  const now = new Date().toISOString();
  const cleanName =
    typeof input.displayName === "string"
      ? input.displayName.trim().replace(/\s+/g, " ").slice(0, 80)
      : "";

  account.googleIdentity = {
    supabaseUserId: input.supabaseUserId,
    linkedAt: account.googleIdentity?.linkedAt || now,
  };
  if (!account.displayName && cleanName) account.displayName = cleanName;
  account.lastLoginAt = now;
  account.updatedAt = now;

  const sessionToken = randomToken();
  const sessionHash = await hash(sessionToken);
  const session: CustomerSessionRecord = {
    version: 1,
    accountId: account.id,
    createdAt: now,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    method: "google",
  };

  await Promise.all([
    writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account),
    writePrivateJson(SESSION_PREFIX + sessionHash + ".json", session),
  ]);

  return {
    sessionToken,
    account: publicAccount(account),
  };

  });
}
