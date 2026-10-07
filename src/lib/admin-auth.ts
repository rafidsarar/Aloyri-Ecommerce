import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  readPrivateJson,
  writeAdminAuditEvent,
  writePrivateJson,
} from "@/lib/storefront-admin-store";

export const ADMIN_COOKIE = "aloyri_ecommerce_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 10;

export const ADMIN_ROLES = [
  "owner",
  "website-manager",
  "content-editor",
  "merchandising-manager",
  "analyst",
  "support",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "dashboard.view",
  "homepage.view",
  "homepage.edit",
  "products.view",
  "products.edit",
  "pages.view",
  "pages.edit",
  "media.view",
  "media.edit",
  "media.delete",
  "merchandising.view",
  "merchandising.edit",
  "merchandising.delete",
  "analytics.view",
  "analytics.export",
  "support.view",
  "support.manage",
  "seo.view",
  "seo.edit",
  "publishing.view",
  "publishing.preview",
  "publishing.publish",
  "publishing.discard",
  "publishing.restore",
  "settings.view",
  "settings.edit",
  "staff.view",
  "staff.manage",
  "audit.view",
  "audit.export",
  "health.view",
  "health.run",
  "backups.view",
  "backups.create",
  "backups.export",
  "backups.restore",
  "security.self",
  "security.owner",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const ALL_PERMISSIONS = [...ADMIN_PERMISSIONS];

const OWNER_ONLY_ASSIGNABLE_PERMISSIONS = new Set<AdminPermission>([
  "staff.manage",
  "publishing.restore",
  "backups.restore",
  "security.owner",
]);

function permissionsActorMayAssign(
  actor: Pick<AdminSession, "role">,
  values: readonly string[],
) {
  const normalized = normalizeAdminPermissions(values);
  return actor.role === "owner"
    ? normalized
    : normalized.filter(
        (permission) => !OWNER_ONLY_ASSIGNABLE_PERMISSIONS.has(permission),
      );
}

export const ROLE_TEMPLATES: Record<AdminRole, AdminPermission[]> = {
  owner: ALL_PERMISSIONS,
  "website-manager": [
    "dashboard.view",
    "homepage.view",
    "homepage.edit",
    "products.view",
    "products.edit",
    "pages.view",
    "pages.edit",
    "media.view",
    "media.edit",
    "media.delete",
    "merchandising.view",
    "merchandising.edit",
    "merchandising.delete",
    "analytics.view",
    "analytics.export",
    "support.view",
    "support.manage",
    "seo.view",
    "seo.edit",
    "publishing.view",
    "publishing.preview",
    "publishing.publish",
    "publishing.discard",
    "settings.view",
    "settings.edit",
    "audit.view",
    "health.view",
    "health.run",
    "backups.view",
    "backups.create",
    "backups.export",
    "security.self",
  ],
  "content-editor": [
    "dashboard.view",
    "homepage.view",
    "homepage.edit",
    "products.view",
    "products.edit",
    "pages.view",
    "pages.edit",
    "media.view",
    "media.edit",
    "seo.view",
    "seo.edit",
    "publishing.view",
    "publishing.preview",
    "security.self",
  ],
  "merchandising-manager": [
    "dashboard.view",
    "products.view",
    "media.view",
    "media.edit",
    "merchandising.view",
    "merchandising.edit",
    "merchandising.delete",
    "analytics.view",
    "seo.view",
    "publishing.view",
    "publishing.preview",
    "security.self",
  ],
  analyst: [
    "dashboard.view",
    "products.view",
    "merchandising.view",
    "analytics.view",
    "analytics.export",
    "audit.view",
    "health.view",
    "security.self",
  ],
  support: [
    "dashboard.view",
    "products.view",
    "pages.view",
    "analytics.view",
    "support.view",
    "support.manage",
    "health.view",
    "security.self",
  ],
};

type RecoveryCodeRecord = {
  hash: string;
  createdAt: string;
  usedAt?: string;
};

type LegacyAdminAuthRecord = {
  version: 1;
  username: string;
  salt: string;
  passwordHash: string;
  sessionSecret: string;
  recoveryCodes?: RecoveryCodeRecord[];
  createdAt: string;
  updatedAt: string;
};

export type AdminAccount = {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  permissions: AdminPermission[];
  active: boolean;
  mustChangePassword: boolean;
  salt: string;
  passwordHash: string;
  sessionSecret: string;
  recoveryCodes?: RecoveryCodeRecord[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  lastLoginAt?: string;
};

type AdminDirectory = {
  version: 2;
  updatedAt: string;
  accounts: AdminAccount[];
};

export type AdminSession = {
  accountId: string;
  username: string;
  displayName: string;
  role: AdminRole;
  permissions: AdminPermission[];
  mustChangePassword: boolean;
  expiresAt: number;
};

type SessionPayload = {
  accountId?: string;
  username: string;
  expiresAt: number;
};

export type PublicAdminAccount = Pick<
  AdminAccount,
  | "id"
  | "username"
  | "displayName"
  | "role"
  | "permissions"
  | "active"
  | "mustChangePassword"
  | "createdAt"
  | "createdBy"
  | "updatedAt"
  | "lastLoginAt"
>;

const LEGACY_AUTH_PATH = "admin/auth.json";
const DIRECTORY_PATH = "admin/accounts.json";

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

function safeUsername(username: string) {
  const value = username.trim();
  if (!/^[A-Za-z0-9._-]{3,48}$/.test(value)) {
    throw new Error(
      "Username must be 3–48 characters using letters, numbers, dot, underscore or dash.",
    );
  }
  return value;
}

function safeDisplayName(value: string, username: string) {
  const name = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return name || username;
}

function safeRole(value: string): AdminRole {
  if ((ADMIN_ROLES as readonly string[]).includes(value)) {
    return value as AdminRole;
  }
  throw new Error("Unknown staff role.");
}

export function normalizeAdminPermissions(
  values: readonly string[],
): AdminPermission[] {
  const allowed = new Set<string>(ADMIN_PERMISSIONS);
  return [...new Set(values.filter((value) => allowed.has(value)))] as AdminPermission[];
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

function publicAccount(account: AdminAccount): PublicAdminAccount {
  const {
    id,
    username,
    displayName,
    role,
    permissions,
    active,
    mustChangePassword,
    createdAt,
    createdBy,
    updatedAt,
    lastLoginAt,
  } = account;
  return {
    id,
    username,
    displayName,
    role,
    permissions,
    active,
    mustChangePassword,
    createdAt,
    createdBy,
    updatedAt,
    ...(lastLoginAt ? { lastLoginAt } : {}),
  };
}

function normalizedAccount(account: AdminAccount): AdminAccount {
  const role = safeRole(account.role);
  return {
    ...account,
    displayName: safeDisplayName(account.displayName || account.username, account.username),
    role,
    permissions:
      role === "owner"
        ? ALL_PERMISSIONS
        : normalizeAdminPermissions([
            ...(account.permissions || ROLE_TEMPLATES[role]),
            "dashboard.view",
            "security.self",
          ]),
    active: account.active !== false,
    mustChangePassword: Boolean(account.mustChangePassword),
  };
}

async function readDirectoryRaw() {
  const stored = await readPrivateJson<AdminDirectory>(DIRECTORY_PATH);
  if (!stored || stored.version !== 2 || !Array.isArray(stored.accounts)) {
    return null;
  }
  return {
    version: 2 as const,
    updatedAt: stored.updatedAt || new Date().toISOString(),
    accounts: stored.accounts.map(normalizedAccount),
  };
}

async function migrateLegacyDirectory() {
  const legacy = await readPrivateJson<LegacyAdminAuthRecord>(LEGACY_AUTH_PATH);
  if (!legacy) return null;

  const now = new Date().toISOString();
  const owner: AdminAccount = {
    id: "owner",
    username: legacy.username,
    displayName: legacy.username,
    role: "owner",
    permissions: ALL_PERMISSIONS,
    active: true,
    mustChangePassword: false,
    salt: legacy.salt,
    passwordHash: legacy.passwordHash,
    sessionSecret: legacy.sessionSecret,
    recoveryCodes: legacy.recoveryCodes || [],
    createdAt: legacy.createdAt || now,
    createdBy: "system",
    updatedAt: legacy.updatedAt || now,
  };
  const directory: AdminDirectory = {
    version: 2,
    updatedAt: now,
    accounts: [owner],
  };
  await writePrivateJson(DIRECTORY_PATH, directory);
  await writeAdminAuditEvent(
    legacy.username,
    "security.staff_directory_migrated",
    "Existing Ecommerce Admin owner migrated to role-based staff access.",
  );
  return directory;
}

export async function readAdminDirectory() {
  return (await readDirectoryRaw()) || (await migrateLegacyDirectory());
}

async function writeDirectory(directory: AdminDirectory) {
  const next: AdminDirectory = {
    version: 2,
    updatedAt: new Date().toISOString(),
    accounts: directory.accounts.map(normalizedAccount),
  };
  await writePrivateJson(DIRECTORY_PATH, next);
  return next;
}

async function accountByUsername(username: string) {
  const directory = await readAdminDirectory();
  if (!directory) return null;
  const normalized = username.trim().toLowerCase();
  return (
    directory.accounts.find(
      (account) => account.username.toLowerCase() === normalized,
    ) || null
  );
}

async function accountById(id: string) {
  const directory = await readAdminDirectory();
  return directory?.accounts.find((account) => account.id === id) || null;
}

export async function listAdminAccounts() {
  const directory = await readAdminDirectory();
  return (directory?.accounts || []).map(publicAccount);
}

export async function getAdminAccount(id: string) {
  const account = await accountById(id);
  return account ? publicAccount(account) : null;
}

export async function adminIsConfigured() {
  return Boolean(await readAdminDirectory());
}

export async function createAdminOwner(username: string, password: string) {
  if (await readAdminDirectory()) {
    throw new Error("Ecommerce Admin is already configured.");
  }

  const safe = safeUsername(username);
  const credentials = await passwordRecord(password);
  const now = new Date().toISOString();
  const account: AdminAccount = {
    id: "owner",
    username: safe,
    displayName: safe,
    role: "owner",
    permissions: ALL_PERMISSIONS,
    active: true,
    mustChangePassword: false,
    ...credentials,
    sessionSecret: bytesToBase64Url(randomBytes(32)),
    recoveryCodes: [],
    createdAt: now,
    createdBy: "setup",
    updatedAt: now,
  };
  await writeDirectory({
    version: 2,
    updatedAt: now,
    accounts: [account],
  });
  await writeAdminAuditEvent(safe, "security.owner_created");
  return account.username;
}

export async function authenticateAdmin(username: string, password: string) {
  const account = await accountByUsername(username);
  if (!account || !account.active) return null;
  const derived = await derivePasswordHash(
    password,
    base64UrlToBytes(account.salt),
  );
  if (!constantTimeEqual(derived, account.passwordHash)) return null;
  return publicAccount(account);
}

export async function verifyAdminCredentials(username: string, password: string) {
  return Boolean(await authenticateAdmin(username, password));
}

export async function noteAdminLogin(username: string) {
  const directory = await readAdminDirectory();
  if (!directory) return;
  const account = directory.accounts.find(
    (candidate) => candidate.username.toLowerCase() === username.trim().toLowerCase(),
  );
  if (!account) return;
  account.lastLoginAt = new Date().toISOString();
  account.updatedAt = account.lastLoginAt;
  await writeDirectory(directory);
  await writeAdminAuditEvent(account.username, "security.login_success");
}

export function hasAdminPermission(
  admin: Pick<AdminSession, "role" | "permissions"> | null | undefined,
  permission: AdminPermission,
) {
  return Boolean(
    admin &&
      (admin.role === "owner" || admin.permissions.includes(permission)),
  );
}

export async function createStaffAccount(
  actor: AdminSession,
  input: {
    username: string;
    displayName: string;
    role: Exclude<AdminRole, "owner">;
    permissions?: string[];
    temporaryPassword: string;
  },
) {
  if (!hasAdminPermission(actor, "staff.manage")) {
    throw new Error("You do not have permission to manage staff.");
  }
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin directory is unavailable.");

  const username = safeUsername(input.username);
  if (
    directory.accounts.some(
      (account) => account.username.toLowerCase() === username.toLowerCase(),
    )
  ) {
    throw new Error("That username is already in use.");
  }

  const role = safeRole(input.role);
  if (role === "owner") throw new Error("Owner accounts cannot be created here.");
  const credentials = await passwordRecord(input.temporaryPassword);
  const now = new Date().toISOString();
  const account: AdminAccount = {
    id: crypto.randomUUID().replace(/-/g, ""),
    username,
    displayName: safeDisplayName(input.displayName, username),
    role,
    permissions: normalizeAdminPermissions([
      ...permissionsActorMayAssign(
        actor,
        input.permissions?.length ? input.permissions : ROLE_TEMPLATES[role],
      ),
      "dashboard.view",
      "security.self",
    ]),
    active: true,
    mustChangePassword: true,
    ...credentials,
    sessionSecret: bytesToBase64Url(randomBytes(32)),
    recoveryCodes: [],
    createdAt: now,
    createdBy: actor.username,
    updatedAt: now,
  };
  directory.accounts.push(account);
  await writeDirectory(directory);
  await writeAdminAuditEvent(
    actor.username,
    "staff.created",
    account.username + " · " + account.role,
    { scope: "staff", target: account.id },
  );
  return publicAccount(account);
}

export async function updateStaffAccess(
  actor: AdminSession,
  input: {
    accountId: string;
    displayName: string;
    role: AdminRole;
    permissions: string[];
  },
) {
  if (!hasAdminPermission(actor, "staff.manage")) {
    throw new Error("You do not have permission to manage staff.");
  }
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin directory is unavailable.");
  const account = directory.accounts.find(
    (candidate) => candidate.id === input.accountId,
  );
  if (!account) throw new Error("Staff account was not found.");

  const before = {
    displayName: account.displayName,
    role: account.role,
    permissions: account.permissions,
  };
  if (account.role === "owner" && actor.role !== "owner") {
    throw new Error("Only the owner can update the owner account.");
  }

  const role = account.role === "owner" ? "owner" : safeRole(input.role);
  if (role === "owner" && account.role !== "owner") {
    throw new Error("Owner role cannot be assigned to another staff account.");
  }

  account.displayName = safeDisplayName(input.displayName, account.username);
  account.role = role;
  account.permissions =
    role === "owner"
      ? ALL_PERMISSIONS
      : normalizeAdminPermissions([
          ...permissionsActorMayAssign(actor, input.permissions),
          "dashboard.view",
          "security.self",
        ]);
  account.updatedAt = new Date().toISOString();
  await writeDirectory(directory);

  await writeAdminAuditEvent(
    actor.username,
    "staff.access_updated",
    account.username,
    {
      scope: "staff",
      target: account.id,
      changes: [
        ...(before.displayName !== account.displayName
          ? [
              {
                path: "displayName",
                before: before.displayName,
                after: account.displayName,
              },
            ]
          : []),
        ...(before.role !== account.role
          ? [{ path: "role", before: before.role, after: account.role }]
          : []),
        ...(JSON.stringify(before.permissions) !==
        JSON.stringify(account.permissions)
          ? [
              {
                path: "permissions",
                before: before.permissions.join(", "),
                after: account.permissions.join(", "),
              },
            ]
          : []),
      ],
    },
  );
  return publicAccount(account);
}

export async function setStaffActive(
  actor: AdminSession,
  accountId: string,
  active: boolean,
) {
  if (actor.role !== "owner") {
    throw new Error("Only the owner can perform this security-sensitive staff action.");
  }
  if (!hasAdminPermission(actor, "staff.manage")) {
    throw new Error("You do not have permission to manage staff.");
  }
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin directory is unavailable.");
  const account = directory.accounts.find(
    (candidate) => candidate.id === accountId,
  );
  if (!account) throw new Error("Staff account was not found.");
  if (account.role === "owner") {
    throw new Error("The owner account cannot be suspended.");
  }
  if (account.id === actor.accountId) {
    throw new Error("You cannot suspend your own account.");
  }
  account.active = active;
  account.sessionSecret = bytesToBase64Url(randomBytes(32));
  account.updatedAt = new Date().toISOString();
  await writeDirectory(directory);
  await writeAdminAuditEvent(
    actor.username,
    active ? "staff.reactivated" : "staff.suspended",
    account.username,
    { scope: "staff", target: account.id },
  );
}

export async function resetStaffPassword(
  actor: AdminSession,
  accountId: string,
  temporaryPassword: string,
) {
  if (actor.role !== "owner") {
    throw new Error("Only the owner can perform this security-sensitive staff action.");
  }
  if (!hasAdminPermission(actor, "staff.manage")) {
    throw new Error("You do not have permission to manage staff.");
  }
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin directory is unavailable.");
  const account = directory.accounts.find(
    (candidate) => candidate.id === accountId,
  );
  if (!account) throw new Error("Staff account was not found.");
  if (account.role === "owner" && actor.role !== "owner") {
    throw new Error("Only the owner can reset the owner account.");
  }

  const credentials = await passwordRecord(temporaryPassword);
  Object.assign(account, credentials);
  account.mustChangePassword = true;
  account.sessionSecret = bytesToBase64Url(randomBytes(32));
  account.updatedAt = new Date().toISOString();
  await writeDirectory(directory);
  await writeAdminAuditEvent(
    actor.username,
    "staff.password_reset",
    account.username + " · all previous sessions revoked",
    { scope: "staff", target: account.id },
  );
}

export async function deleteStaffAccount(
  actor: AdminSession,
  accountId: string,
) {
  if (actor.role !== "owner") {
    throw new Error("Only the owner can perform this security-sensitive staff action.");
  }
  if (!hasAdminPermission(actor, "staff.manage")) {
    throw new Error("You do not have permission to manage staff.");
  }
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin directory is unavailable.");
  const account = directory.accounts.find(
    (candidate) => candidate.id === accountId,
  );
  if (!account) throw new Error("Staff account was not found.");
  if (account.role === "owner") {
    throw new Error("The owner account cannot be deleted.");
  }
  if (account.id === actor.accountId) {
    throw new Error("You cannot delete your own account.");
  }
  directory.accounts = directory.accounts.filter(
    (candidate) => candidate.id !== accountId,
  );
  await writeDirectory(directory);
  await writeAdminAuditEvent(
    actor.username,
    "staff.deleted",
    account.username,
    { scope: "staff", target: account.id },
  );
}

export async function changeAdminPassword(
  username: string,
  currentPassword: string,
  newPassword: string,
) {
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin account is not available.");
  const account = directory.accounts.find(
    (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
  );
  if (!account || !account.active) {
    throw new Error("Admin account is not available.");
  }

  const derived = await derivePasswordHash(
    currentPassword,
    base64UrlToBytes(account.salt),
  );
  if (!constantTimeEqual(derived, account.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }
  if (constantTimeEqual(currentPassword, newPassword)) {
    throw new Error("Choose a different password.");
  }

  const credentials = await passwordRecord(newPassword);
  Object.assign(account, credentials);
  account.mustChangePassword = false;
  account.sessionSecret = bytesToBase64Url(randomBytes(32));
  account.updatedAt = new Date().toISOString();
  await writeDirectory(directory);
  await writeAdminAuditEvent(username, "security.password_changed");
}

export async function rotateAdminSessions(username: string) {
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin account is not available.");
  const account = directory.accounts.find(
    (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
  );
  if (!account) throw new Error("Admin account is not available.");
  account.sessionSecret = bytesToBase64Url(randomBytes(32));
  account.updatedAt = new Date().toISOString();
  await writeDirectory(directory);
  await writeAdminAuditEvent(username, "security.sessions_rotated");
}

export async function generateAdminRecoveryCodes(
  username: string,
  currentPassword: string,
) {
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Admin account is not available.");
  const account = directory.accounts.find(
    (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
  );
  if (!account || account.role !== "owner") {
    throw new Error("Recovery codes are available only for the owner account.");
  }

  const derived = await derivePasswordHash(
    currentPassword,
    base64UrlToBytes(account.salt),
  );
  if (!constantTimeEqual(derived, account.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }

  const codes = Array.from({ length: 8 }, () => makeRecoveryCode());
  const createdAt = new Date().toISOString();
  account.recoveryCodes = await Promise.all(
    codes.map(async (code) => ({
      hash: await sha256(normalizeRecoveryCode(code)),
      createdAt,
    })),
  );
  account.updatedAt = createdAt;
  await writeDirectory(directory);
  await writeAdminAuditEvent(
    username,
    "security.recovery_codes_regenerated",
    "Eight new one-time owner recovery codes replaced all previous codes.",
  );
  return codes;
}

export async function adminRecoveryStatus(username?: string) {
  const directory = await readAdminDirectory();
  const account = username
    ? directory?.accounts.find(
        (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
      )
    : directory?.accounts.find((candidate) => candidate.role === "owner");
  const codes = account?.role === "owner" ? account.recoveryCodes || [] : [];
  return {
    available: account?.role === "owner",
    configured: codes.length > 0,
    remaining: codes.filter((code) => !code.usedAt).length,
  };
}

export async function resetAdminPasswordWithRecoveryCode(
  username: string,
  recoveryCode: string,
  newPassword: string,
) {
  const directory = await readAdminDirectory();
  if (!directory) throw new Error("Recovery details are not valid.");
  const account = directory.accounts.find(
    (candidate) => candidate.username.toLowerCase() === username.trim().toLowerCase(),
  );
  if (!account || account.role !== "owner") {
    throw new Error("Recovery details are not valid.");
  }

  const incomingHash = await sha256(normalizeRecoveryCode(recoveryCode));
  const codes = account.recoveryCodes || [];
  const matchIndex = codes.findIndex(
    (record) => !record.usedAt && constantTimeEqual(record.hash, incomingHash),
  );
  if (matchIndex < 0) {
    throw new Error("Recovery details are not valid.");
  }

  const credentials = await passwordRecord(newPassword);
  const now = new Date().toISOString();
  account.recoveryCodes = codes.map((record, index) =>
    index === matchIndex ? { ...record, usedAt: now } : record,
  );
  Object.assign(account, credentials);
  account.mustChangePassword = false;
  account.sessionSecret = bytesToBase64Url(randomBytes(32));
  account.updatedAt = now;
  await writeDirectory(directory);
  await writeAdminAuditEvent(username, "security.password_recovered");
}

export async function createAdminSession(username: string) {
  const account = await accountByUsername(username);
  if (!account || !account.active) {
    throw new Error("Admin account is not available.");
  }
  const payload: SessionPayload = {
    accountId: account.id,
    username: account.username,
    expiresAt: Date.now() + ADMIN_SESSION_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = await sign(account.sessionSecret, encoded);
  return encoded + "." + signature;
}

export async function verifyAdminSession(value?: string | null) {
  if (!value) return null;
  const [payloadPart, signature] = value.split(".");
  if (!payloadPart || !signature) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    return null;
  }

  const account = payload.accountId
    ? await accountById(payload.accountId)
    : await accountByUsername(payload.username);
  if (
    !account ||
    !account.active ||
    account.username !== payload.username ||
    !Number.isFinite(payload.expiresAt) ||
    payload.expiresAt <= Date.now()
  ) {
    return null;
  }

  const expected = await sign(account.sessionSecret, payloadPart);
  if (!constantTimeEqual(expected, signature)) return null;

  return {
    accountId: account.id,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    permissions: account.role === "owner" ? ALL_PERMISSIONS : account.permissions,
    mustChangePassword: account.mustChangePassword,
    expiresAt: payload.expiresAt,
  } satisfies AdminSession;
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

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword && permission !== "security.self") {
    redirect("/admin/security?mustChange=1");
  }
  if (!hasAdminPermission(admin, permission)) {
    redirect("/admin?forbidden=1");
  }
  return admin;
}
