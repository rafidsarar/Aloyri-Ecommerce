import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  readPrivateJson,
  writeAdminAuditEvent,
  writePrivateJson,
} from "@/lib/storefront-admin-store";

type RecoveryCodeRecord = {
  hash: string;
  createdAt: string;
  usedAt?: string;
};

type AdminAuthRecord = {
  version: 1;
  username: string;
  salt: string;
  passwordHash: string;
  sessionSecret: string;
  recoveryCodes?: RecoveryCodeRecord[];
  createdAt: string;
  updatedAt: string;
};

type SessionPayload = {
  username: string;
  expiresAt: number;
};

const AUTH_PATH = "admin/auth.json";
export const ADMIN_COOKIE = "aloyri_ecommerce_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 10;

function bytesToBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(normalized, "base64"));
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) {
    different |= left[index] ^ right[index];
  }
  return different === 0;
}

function validatePassword(password: string) {
  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must be between 12 and 128 characters.");
  }
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt).buffer,
      iterations: 210_000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

async function sign(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    base64UrlToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function normalizeRecoveryCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function makeRecoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let body = "";
  for (let index = 0; index < bytes.length; index += 1) {
    body += alphabet[bytes[index] % alphabet.length];
  }
  return "ALY-" + body.slice(0, 4) + "-" + body.slice(4, 8) + "-" + body.slice(8);
}

async function passwordRecord(password: string) {
  validatePassword(password);
  const salt = randomBytes(16);
  return {
    salt: bytesToBase64Url(salt),
    passwordHash: await derivePasswordHash(password, salt),
  };
}

export async function readAdminAuth() {
  return readPrivateJson<AdminAuthRecord>(AUTH_PATH);
}

export async function adminIsConfigured() {
  return Boolean(await readAdminAuth());
}

export async function createAdminOwner(username: string, password: string) {
  if (await readAdminAuth()) {
    throw new Error("Ecommerce Admin is already configured.");
  }

  const safeUsername = username.trim();
  if (!/^[A-Za-z0-9._-]{3,48}$/.test(safeUsername)) {
    throw new Error(
      "Username must be 3–48 characters using letters, numbers, dot, underscore or dash.",
    );
  }

  const credentials = await passwordRecord(password);
  const now = new Date().toISOString();
  const record: AdminAuthRecord = {
    version: 1,
    username: safeUsername,
    ...credentials,
    sessionSecret: bytesToBase64Url(randomBytes(32)),
    recoveryCodes: [],
    createdAt: now,
    updatedAt: now,
  };

  await writePrivateJson(AUTH_PATH, record);
  await writeAdminAuditEvent(safeUsername, "security.owner_created");
  return record.username;
}

export async function verifyAdminCredentials(username: string, password: string) {
  const auth = await readAdminAuth();
  if (!auth) return false;
  if (!constantTimeEqual(auth.username, username.trim())) return false;
  const derived = await derivePasswordHash(
    password,
    base64UrlToBytes(auth.salt),
  );
  return constantTimeEqual(derived, auth.passwordHash);
}

export async function changeAdminPassword(
  username: string,
  currentPassword: string,
  newPassword: string,
) {
  const auth = await readAdminAuth();
  if (!auth || !constantTimeEqual(auth.username, username)) {
    throw new Error("Admin account is not available.");
  }

  const valid = await verifyAdminCredentials(username, currentPassword);
  if (!valid) throw new Error("Current password is incorrect.");
  if (constantTimeEqual(currentPassword, newPassword)) {
    throw new Error("Choose a different password.");
  }

  const credentials = await passwordRecord(newPassword);
  const next: AdminAuthRecord = {
    ...auth,
    ...credentials,
    sessionSecret: bytesToBase64Url(randomBytes(32)),
    updatedAt: new Date().toISOString(),
  };
  await writePrivateJson(AUTH_PATH, next);
  await writeAdminAuditEvent(username, "security.password_changed");
}

export async function rotateAdminSessions(username: string) {
  const auth = await readAdminAuth();
  if (!auth || !constantTimeEqual(auth.username, username)) {
    throw new Error("Admin account is not available.");
  }
  await writePrivateJson(AUTH_PATH, {
    ...auth,
    sessionSecret: bytesToBase64Url(randomBytes(32)),
    updatedAt: new Date().toISOString(),
  } satisfies AdminAuthRecord);
  await writeAdminAuditEvent(username, "security.sessions_rotated");
}

export async function generateAdminRecoveryCodes(
  username: string,
  currentPassword: string,
) {
  const auth = await readAdminAuth();
  if (!auth || !constantTimeEqual(auth.username, username)) {
    throw new Error("Admin account is not available.");
  }
  if (!(await verifyAdminCredentials(username, currentPassword))) {
    throw new Error("Current password is incorrect.");
  }

  const codes = Array.from({ length: 8 }, () => makeRecoveryCode());
  const createdAt = new Date().toISOString();
  const recoveryCodes: RecoveryCodeRecord[] = await Promise.all(
    codes.map(async (code) => ({
      hash: await sha256(normalizeRecoveryCode(code)),
      createdAt,
    })),
  );

  await writePrivateJson(AUTH_PATH, {
    ...auth,
    recoveryCodes,
    updatedAt: createdAt,
  } satisfies AdminAuthRecord);
  await writeAdminAuditEvent(
    username,
    "security.recovery_codes_regenerated",
    "Eight new one-time recovery codes replaced all previous codes.",
  );
  return codes;
}

export async function adminRecoveryStatus() {
  const auth = await readAdminAuth();
  const codes = auth?.recoveryCodes || [];
  return {
    configured: codes.length > 0,
    remaining: codes.filter((code) => !code.usedAt).length,
  };
}

export async function resetAdminPasswordWithRecoveryCode(
  username: string,
  recoveryCode: string,
  newPassword: string,
) {
  const auth = await readAdminAuth();
  if (!auth || !constantTimeEqual(auth.username, username.trim())) {
    throw new Error("Recovery details are not valid.");
  }

  const normalized = normalizeRecoveryCode(recoveryCode);
  const incomingHash = await sha256(normalized);
  const codes = auth.recoveryCodes || [];
  const matchIndex = codes.findIndex(
    (record) => !record.usedAt && constantTimeEqual(record.hash, incomingHash),
  );
  if (matchIndex < 0) {
    throw new Error("Recovery details are not valid.");
  }

  const credentials = await passwordRecord(newPassword);
  const now = new Date().toISOString();
  const nextCodes = codes.map((record, index) =>
    index === matchIndex ? { ...record, usedAt: now } : record,
  );

  await writePrivateJson(AUTH_PATH, {
    ...auth,
    ...credentials,
    recoveryCodes: nextCodes,
    sessionSecret: bytesToBase64Url(randomBytes(32)),
    updatedAt: now,
  } satisfies AdminAuthRecord);
  await writeAdminAuditEvent(username, "security.password_recovered");
}

export async function createAdminSession(username: string) {
  const auth = await readAdminAuth();
  if (!auth || !constantTimeEqual(auth.username, username)) {
    throw new Error("Admin account is not available.");
  }

  const payload: SessionPayload = {
    username,
    expiresAt: Date.now() + ADMIN_SESSION_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = await sign(auth.sessionSecret, encoded);
  return encoded + "." + signature;
}

export async function verifyAdminSession(value?: string | null) {
  if (!value) return null;
  const [payloadPart, signature] = value.split(".");
  if (!payloadPart || !signature) return null;

  const auth = await readAdminAuth();
  if (!auth) return null;
  const expected = await sign(auth.sessionSecret, payloadPart);
  if (!constantTimeEqual(expected, signature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      payload.username !== auth.username ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function currentAdmin() {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
}

export async function requireAdminPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
