import "server-only";

import { cookies } from "next/headers";
import {
  createPrivateJsonOnce,
  readPrivateJson,
  writePrivateJson,
} from "@/lib/storefront-admin-store";
import {
  brandedEmailShell,
  sendTransactionalEmail,
  transactionalEmailReadiness,
} from "@/lib/email-delivery";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { syncCustomerAccountToCrm } from "@/lib/crm-customer-integration";
import { siteConfig } from "@/lib/site";

export const CUSTOMER_SESSION_COOKIE = "aloyri_customer_session";
const MAGIC_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 210_000;

export type CustomerEmailPreferences = {
  postDelivery: boolean;
  reviewRequest: boolean;
  reorderReminder: boolean;
};

export type CustomerOrderRef = {
  orderNumber: string;
  createdAt: string;
  items: Array<{ productId: string; qty: number }>;
  total?: number;
};

const defaultEmailPreferences: CustomerEmailPreferences = {
  postDelivery: false,
  reviewRequest: false,
  reorderReminder: false,
};

type PasswordCredential = {
  salt: string;
  hash: string;
  iterations: number;
};

type CustomerAccount = {
  version: 1 | 2;
  id: string;
  email: string;
  emailHash: string;
  displayName: string;
  phone?: string;
  address?: string;
  district?: string;
  consent?: boolean;
  password?: PasswordCredential;
  crmCustomerId?: string;
  crmSync?: "linked" | "pending";
  savedProductIds: string[];
  orderRefs?: CustomerOrderRef[];
  emailPreferences?: CustomerEmailPreferences;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

type AccountIndex = {
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
  phone: string;
  address: string;
  district: string;
  consent: boolean;
  crmCustomerId?: string;
  crmLinked: boolean;
  orderRefs: CustomerOrderRef[];
  emailPreferences: CustomerEmailPreferences;
  passwordEnabled: boolean;
};

const ACCOUNT_PREFIX = "customer-auth/accounts/";
const EMAIL_PREFIX = "customer-auth/email/";
const PHONE_PREFIX = "customer-auth/phone/";
const MAGIC_PREFIX = "customer-auth/magic/";
const MAGIC_CLAIM_PREFIX = "customer-auth/magic-claims/";
const SESSION_PREFIX = "customer-auth/sessions/";

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function cleanText(value: string, max: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function safeNextPath(value: string | undefined) {
  const path = (value || "/account").trim();
  return path.startsWith("/") && !path.startsWith("//") && path.length <= 240
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

function safeOrderRefs(values: CustomerOrderRef[] | undefined) {
  if (!Array.isArray(values)) return [] as CustomerOrderRef[];
  const seen = new Set<string>();
  return values
    .filter((value) =>
      value &&
      /^WEB-[A-Z0-9-]{8,90}$/.test(value.orderNumber) &&
      !Number.isNaN(Date.parse(value.createdAt)),
    )
    .filter((value) => {
      if (seen.has(value.orderNumber)) return false;
      seen.add(value.orderNumber);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
}

function publicAccount(account: CustomerAccount): PublicCustomerAccount {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    phone: account.phone || "",
    address: account.address || "",
    district: account.district || "",
    consent: Boolean(account.consent),
    savedProductIds: account.savedProductIds || [],
    orderRefs: safeOrderRefs(account.orderRefs),
    crmCustomerId: account.crmCustomerId,
    crmLinked: account.crmSync === "linked" && Boolean(account.crmCustomerId),
    passwordEnabled: Boolean(account.password),
    emailPreferences: {
      ...defaultEmailPreferences,
      ...(account.emailPreferences || {}),
    },
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    ...(account.lastLoginAt ? { lastLoginAt: account.lastLoginAt } : {}),
  };
}

function randomToken(bytesLength = 32) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
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

async function phoneHash(phone: string) {
  return hash("aloyri-customer-phone-v1:" + phone);
}

function validPassword(password: string) {
  return password.length >= 12 && password.length <= 128;
}

async function passwordCredential(password: string, salt = randomToken(18), iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations,
    },
    key,
    256,
  );
  return {
    salt,
    hash: Buffer.from(new Uint8Array(derived)).toString("base64url"),
    iterations,
  } satisfies PasswordCredential;
}

async function passwordMatches(password: string, credential: PasswordCredential) {
  const candidate = await passwordCredential(
    password,
    credential.salt,
    credential.iterations,
  );
  const left = candidate.hash;
  const right = credential.hash;
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export function customerAuthReadiness() {
  const email = transactionalEmailReadiness();
  const switchEnabled = process.env.ALOYRI_CUSTOMER_AUTH_ENABLED === "1";
  return {
    enabled: switchEnabled,
    passwordEnabled: switchEnabled,
    magicLinkEnabled: switchEnabled && email.ready,
    switchEnabled,
    domainReady: email.domainReady,
    senderReady: email.senderReady,
  };
}

async function accountByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const hashed = await emailHash(normalized);
  const index = await readPrivateJson<AccountIndex>(EMAIL_PREFIX + hashed + ".json");
  if (!index?.accountId) return null;
  return readPrivateJson<CustomerAccount>(ACCOUNT_PREFIX + index.accountId + ".json");
}

async function accountById(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  return readPrivateJson<CustomerAccount>(ACCOUNT_PREFIX + id + ".json");
}

async function accountByPhone(phone: string) {
  if (!isValidBangladeshPhone(phone)) return null;
  const normalized = normalizeBangladeshPhone(phone);
  const index = await readPrivateJson<AccountIndex>(
    PHONE_PREFIX + (await phoneHash(normalized)) + ".json",
  );
  if (!index?.accountId) return null;
  return accountById(index.accountId);
}

async function createSession(account: CustomerAccount) {
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
    writePrivateJson(SESSION_PREFIX + sessionHash + ".json", session),
    writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account),
  ]);
  return { sessionToken, account: publicAccount(account) };
}

async function syncAccountToCrm(account: CustomerAccount) {
  if (!account.phone || !isValidBangladeshPhone(account.phone) || !account.displayName) {
    account.crmSync = "pending";
    await writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account);
    return false;
  }

  const result = await syncCustomerAccountToCrm({
    accountId: account.id,
    email: account.email,
    name: account.displayName,
    phone: normalizeBangladeshPhone(account.phone),
    address: account.address || "",
    district: account.district || "",
    consent: Boolean(account.consent),
    createdAt: account.createdAt,
  });

  if (result.ok) {
    account.crmCustomerId = result.body.customerId;
    account.crmSync = "linked";
    account.updatedAt = new Date().toISOString();
    await writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account);
    return true;
  }

  account.crmSync = "pending";
  await writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account);
  return false;
}

async function ensureAccount(email: string) {
  const existing = await accountByEmail(email);
  if (existing) return existing;

  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("INVALID_EMAIL");
  const hashed = await emailHash(normalized);
  const now = new Date().toISOString();
  const account: CustomerAccount = {
    version: 2,
    id: crypto.randomUUID().replace(/-/g, ""),
    email: normalized,
    emailHash: hashed,
    displayName: "",
    savedProductIds: [],
    orderRefs: [],
    emailPreferences: { ...defaultEmailPreferences },
    crmSync: "pending",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account);
  const claimed = await createPrivateJsonOnce(EMAIL_PREFIX + hashed + ".json", {
    version: 1,
    accountId: account.id,
  } satisfies AccountIndex);
  if (claimed) return account;

  const winner = await accountByEmail(normalized);
  if (!winner) throw new Error("ACCOUNT_CREATE_CONFLICT");
  return winner;
}

export async function registerCustomerAccount(input: {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  address?: string;
  district?: string;
  consent?: boolean;
}) {
  if (!customerAuthReadiness().passwordEnabled) throw new Error("AUTH_NOT_READY");

  const email = normalizeEmail(input.email);
  if (!email) throw new Error("INVALID_EMAIL");
  if (!validPassword(input.password)) throw new Error("INVALID_PASSWORD");
  if (!isValidBangladeshPhone(input.phone)) throw new Error("INVALID_PHONE");
  const phone = normalizeBangladeshPhone(input.phone);
  const displayName = cleanText(input.displayName, 80);
  if (displayName.length < 2) throw new Error("INVALID_NAME");

  const byEmail = await accountByEmail(email);
  const byPhone = await accountByPhone(phone);
  if (byEmail?.password) throw new Error("ACCOUNT_EXISTS");
  if (byPhone && byPhone.id !== byEmail?.id) throw new Error("PHONE_IN_USE");

  const account = byEmail || (await ensureAccount(email));
  account.version = 2;
  account.displayName = displayName;
  account.phone = phone;
  account.address = cleanText(input.address || "", 500);
  account.district = cleanText(input.district || "", 80);
  account.consent = Boolean(input.consent);
  account.password = await passwordCredential(input.password);
  account.crmSync = "pending";
  account.updatedAt = new Date().toISOString();

  const phoneIndexPath = PHONE_PREFIX + (await phoneHash(phone)) + ".json";
  const phoneIndex = await readPrivateJson<AccountIndex>(phoneIndexPath);
  if (phoneIndex?.accountId && phoneIndex.accountId !== account.id) {
    throw new Error("PHONE_IN_USE");
  }

  await writePrivateJson(ACCOUNT_PREFIX + account.id + ".json", account);
  if (!phoneIndex) {
    const claimed = await createPrivateJsonOnce(phoneIndexPath, {
      version: 1,
      accountId: account.id,
    } satisfies AccountIndex);
    if (!claimed) {
      const winner = await accountByPhone(phone);
      if (!winner || winner.id !== account.id) throw new Error("PHONE_IN_USE");
    }
  }

  const crmLinked = await syncAccountToCrm(account);
  if (!crmLinked) throw new Error("CRM_SYNC_FAILED");

  return createSession(account);
}

export async function loginCustomerWithPassword(email: string, password: string) {
  if (!customerAuthReadiness().passwordEnabled) throw new Error("AUTH_NOT_READY");
  const normalized = normalizeEmail(email);
  if (!normalized || !validPassword(password)) throw new Error("INVALID_CREDENTIALS");
  const account = await accountByEmail(normalized);
  if (!account?.password || !(await passwordMatches(password, account.password))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (account.phone && account.displayName) {
    await syncAccountToCrm(account);
  }
  return createSession(account);
}

export async function requestCustomerMagicLink(email: string, nextPath?: string) {
  if (!customerAuthReadiness().magicLinkEnabled) throw new Error("AUTH_NOT_READY");

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

  const verifyUrl = siteConfig.url + "/api/customer-auth/verify?token=" + encodeURIComponent(rawToken);
  const sent = await sendTransactionalEmail({
    to: normalized,
    subject: "Your secure Aloyri sign-in link",
    html: brandedEmailShell({
      eyebrow: "Secure customer account",
      title: "Sign in to Aloyri",
      copy: "Use this one-time link to sign in securely. The link expires in 15 minutes and can only be used once.",
      ctaLabel: "Sign in securely",
      ctaHref: verifyUrl,
      footer: "If you did not request this link, you can safely ignore this email.",
    }),
    text: "Sign in to Aloyri: " + verifyUrl + "\n\nThis one-time link expires in 15 minutes.",
  });
  if (!sent.ok) throw new Error(sent.code);
  return { sent: true as const };
}

export async function consumeCustomerMagicLink(token: string) {
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) throw new Error("INVALID_TOKEN");
  const tokenHash = await hash(token);
  const path = MAGIC_PREFIX + tokenHash + ".json";
  const record = await readPrivateJson<MagicToken>(path);
  if (!record || record.usedAt || Date.parse(record.expiresAt) <= Date.now()) {
    throw new Error("INVALID_TOKEN");
  }

  const claimed = await createPrivateJsonOnce(
    MAGIC_CLAIM_PREFIX + tokenHash + ".json",
    { version: 1, claimedAt: new Date().toISOString() },
  );
  if (!claimed) throw new Error("INVALID_TOKEN");

  const account = await ensureAccount(record.email);
  const now = new Date().toISOString();
  await writePrivateJson(path, { ...record, usedAt: now } satisfies MagicToken);
  const session = await createSession(account);
  return {
    sessionToken: session.sessionToken,
    nextPath: safeNextPath(record.nextPath),
    account: session.account,
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
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
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
    { ...current.session, revokedAt: new Date().toISOString() } satisfies CustomerSessionRecord,
  );
}

export async function customerEmailPreferencesForEmail(email: string) {
  const account = await accountByEmail(email);
  return account
    ? { ...defaultEmailPreferences, ...(account.emailPreferences || {}) }
    : { ...defaultEmailPreferences };
}

export async function updateCurrentCustomerAccount(input: {
  displayName?: string;
  address?: string;
  district?: string;
  consent?: boolean;
  savedProductIds?: unknown;
  emailPreferences?: Partial<CustomerEmailPreferences>;
}) {
  const current = await currentCustomerSession();
  if (!current) throw new Error("UNAUTHENTICATED");
  const stored = await accountById(current.account.id);
  if (!stored) throw new Error("UNAUTHENTICATED");

  if (typeof input.displayName === "string") {
    const name = cleanText(input.displayName, 80);
    if (name.length < 2) throw new Error("INVALID_NAME");
    stored.displayName = name;
  }
  if (typeof input.address === "string") stored.address = cleanText(input.address, 500);
  if (typeof input.district === "string") stored.district = cleanText(input.district, 80);
  if (typeof input.consent === "boolean") stored.consent = input.consent;
  if (input.savedProductIds !== undefined) stored.savedProductIds = safeIds(input.savedProductIds);

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
  await syncAccountToCrm(stored);
  return publicAccount(stored);
}

export async function rememberOrderForCurrentCustomer(input: {
  orderNumber: string;
  phone: string;
  createdAt: string;
  items: Array<{ productId: string; qty: number }>;
  total?: number;
}) {
  const current = await currentCustomerSession();
  if (!current?.account.phone) return false;
  const phone = normalizeBangladeshPhone(input.phone);
  if (phone !== normalizeBangladeshPhone(current.account.phone)) return false;
  if (!/^WEB-[A-Z0-9-]{8,90}$/.test(input.orderNumber)) return false;

  const stored = await accountById(current.account.id);
  if (!stored) return false;
  const next: CustomerOrderRef = {
    orderNumber: input.orderNumber,
    createdAt: new Date(input.createdAt).toISOString(),
    items: input.items.slice(0, 50),
    ...(typeof input.total === "number" ? { total: input.total } : {}),
  };
  stored.orderRefs = safeOrderRefs([next, ...(stored.orderRefs || [])]);
  stored.updatedAt = new Date().toISOString();
  await writePrivateJson(ACCOUNT_PREFIX + stored.id + ".json", stored);
  return true;
}
