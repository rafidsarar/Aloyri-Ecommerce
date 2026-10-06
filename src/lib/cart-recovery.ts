import "server-only";

import { get, list } from "@vercel/blob";
import {
  readPrivateJson,
  storefrontStoragePath,
  writePrivateJson,
} from "@/lib/storefront-admin-store";
import { siteConfig } from "@/lib/site";

export type CartRecoveryStatus =
  | "pending"
  | "sent"
  | "cancelled"
  | "expired";

export type CartRecoveryRecord = {
  version: 1;
  id: string;
  email: string;
  emailHash: string;
  token: string;
  unsubscribeToken: string;
  items: Array<{ productId: string; qty: number }>;
  itemCount: number;
  totalBdt: number;
  status: CartRecoveryStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string;
  expiresAt: string;
  sentAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
};

const ITEM_PREFIX = "cart-recovery/items/";
const RESTORE_PREFIX = "cart-recovery/restore/";
const UNSUBSCRIBE_PREFIX = "cart-recovery/unsubscribe/";
const MAX_RECORDS = 5000;

function configuredEmail(value: string | undefined) {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : "";
}

export function cartRecoveryReadiness() {
  const domainReady = process.env.ALOYRI_EMAIL_DOMAIN_VERIFIED === "1";
  const recoveryEnabled = process.env.ALOYRI_CART_RECOVERY_ENABLED === "1";
  const resendReady = Boolean(process.env.RESEND_API_KEY);
  const fromEmail = configuredEmail(process.env.ALOYRI_RECOVERY_FROM_EMAIL);
  const senderReady = resendReady && Boolean(fromEmail);
  return {
    enabled: domainReady && recoveryEnabled && senderReady,
    domainReady,
    recoveryEnabled,
    senderReady,
    fromEmail: senderReady ? fromEmail : undefined,
  };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function safeToken() {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result) return null;
    return JSON.parse(await new Response(result.stream).text()) as T;
  } catch {
    return null;
  }
}

export async function listCartRecoveries(limit = MAX_RECORDS) {
  const output: CartRecoveryRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix: storefrontStoragePath(ITEM_PREFIX),
      limit: Math.min(1000, Math.max(1, limit - output.length)),
      ...(cursor ? { cursor } : {}),
    });
    const rows = await Promise.all(
      page.blobs.map((blob) =>
        readBlobJson<CartRecoveryRecord>(blob.pathname),
      ),
    );
    output.push(
      ...rows.filter(
        (row): row is CartRecoveryRecord => Boolean(row),
      ),
    );
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && output.length < limit);

  return output.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCartRecovery(input: {
  email: string;
  items: Array<{ productId: string; qty: number }>;
  totalBdt: number;
}) {
  const readiness = cartRecoveryReadiness();
  if (!readiness.enabled) {
    throw new Error("RECOVERY_NOT_READY");
  }

  const email = configuredEmail(input.email);
  if (!email) throw new Error("INVALID_EMAIL");
  const items = input.items
    .filter(
      (item) =>
        /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(item.productId) &&
        Number.isInteger(item.qty) &&
        item.qty >= 1 &&
        item.qty <= 100,
    )
    .slice(0, 50);
  if (!items.length) throw new Error("EMPTY_CART");

  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const record: CartRecoveryRecord = {
    version: 1,
    id: crypto.randomUUID().replace(/-/g, ""),
    email,
    emailHash: await sha256("aloyri-cart-recovery-v1:" + email),
    token: safeToken(),
    unsubscribeToken: safeToken(),
    items,
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
    totalBdt:
      Number.isFinite(input.totalBdt) && input.totalBdt >= 0
        ? Math.round(input.totalBdt * 100) / 100
        : 0,
    status: "pending",
    createdAt,
    updatedAt: createdAt,
    scheduledAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  await Promise.all([
    writePrivateJson(ITEM_PREFIX + record.id + ".json", record),
    writePrivateJson(RESTORE_PREFIX + record.token + ".json", {
      version: 1,
      recordId: record.id,
    }),
    writePrivateJson(
      UNSUBSCRIBE_PREFIX + record.unsubscribeToken + ".json",
      {
        version: 1,
        recordId: record.id,
      },
    ),
  ]);
  return record;
}

export async function recoveryByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,160}$/.test(token)) return null;
  const marker = await readPrivateJson<{ recordId?: string }>(
    RESTORE_PREFIX + token + ".json",
  );
  if (!marker?.recordId) return null;
  const record = await readPrivateJson<CartRecoveryRecord>(
    ITEM_PREFIX + marker.recordId + ".json",
  );
  if (!record) return null;
  if (Date.parse(record.expiresAt) <= Date.now()) return null;
  if (record.status === "cancelled" || record.status === "expired") return null;
  return record;
}

export async function cancelRecoveryByUnsubscribeToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,160}$/.test(token)) return false;
  const marker = await readPrivateJson<{ recordId?: string }>(
    UNSUBSCRIBE_PREFIX + token + ".json",
  );
  if (!marker?.recordId) return false;
  const path = ITEM_PREFIX + marker.recordId + ".json";
  const record = await readPrivateJson<CartRecoveryRecord>(path);
  if (!record) return false;
  const now = new Date().toISOString();
  await writePrivateJson(path, {
    ...record,
    status: "cancelled",
    cancelledAt: now,
    cancelReason: "unsubscribed",
    updatedAt: now,
  } satisfies CartRecoveryRecord);
  return true;
}

export async function cancelPendingCartRecoveries(email: string) {
  const normalized = configuredEmail(email);
  if (!normalized) return 0;
  const hash = await sha256("aloyri-cart-recovery-v1:" + normalized);
  const rows = await listCartRecoveries();
  const matches = rows.filter(
    (row) => row.emailHash === hash && row.status === "pending",
  );
  const now = new Date().toISOString();
  await Promise.all(
    matches.map((row) =>
      writePrivateJson(ITEM_PREFIX + row.id + ".json", {
        ...row,
        status: "cancelled",
        cancelledAt: now,
        cancelReason: "order-created",
        updatedAt: now,
      } satisfies CartRecoveryRecord),
    ),
  );
  return matches.length;
}

function recoveryHtml(record: CartRecoveryRecord) {
  const restoreUrl =
    siteConfig.url +
    "/cart?recovery=" +
    encodeURIComponent(record.token);
  const unsubscribeUrl =
    siteConfig.url +
    "/api/cart-recovery/unsubscribe?token=" +
    encodeURIComponent(record.unsubscribeToken);
  return `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;color:#321f1c;background:#fffaf7;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eadbd6;border-radius:20px;padding:28px">
      <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#713a35">Aloyri</p>
      <h1 style="font-size:30px;line-height:1.1;margin:12px 0">Your skincare cart is still waiting.</h1>
      <p style="line-height:1.7;color:#66504c">You asked Aloyri to save this cart if checkout was not completed. It currently contains ${record.itemCount} item${record.itemCount === 1 ? "" : "s"}.</p>
      <a href="${restoreUrl}" style="display:inline-block;margin-top:18px;background:#713a35;color:white;text-decoration:none;border-radius:999px;padding:14px 22px;font-weight:700">Return to your cart</a>
      <p style="margin-top:24px;font-size:12px;line-height:1.6;color:#806d69">Live price and stock are rechecked before checkout. This recovery link expires automatically.</p>
      <p style="margin-top:18px;font-size:11px;color:#8a7773"><a href="${unsubscribeUrl}" style="color:#713a35">Stop cart recovery emails</a></p>
    </div>
  </body>
</html>`;
}

export async function sendDueCartRecoveries(limit = 50) {
  const readiness = cartRecoveryReadiness();
  if (!readiness.enabled || !readiness.fromEmail) {
    return {
      enabled: false,
      sent: 0,
      failed: 0,
      reason: "RECOVERY_NOT_READY",
    };
  }

  const apiKey = process.env.RESEND_API_KEY || "";
  const now = Date.now();
  const rows = (await listCartRecoveries())
    .filter(
      (row) =>
        row.status === "pending" &&
        Date.parse(row.scheduledAt) <= now &&
        Date.parse(row.expiresAt) > now,
    )
    .slice(0, Math.min(Math.max(limit, 1), 100));

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: "Bearer " + apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: readiness.fromEmail,
          to: [row.email],
          subject: "Your Aloyri cart is waiting",
          html: recoveryHtml(row),
        }),
      });
      if (!response.ok) {
        failed += 1;
        continue;
      }
      const sentAt = new Date().toISOString();
      await writePrivateJson(ITEM_PREFIX + row.id + ".json", {
        ...row,
        status: "sent",
        sentAt,
        updatedAt: sentAt,
      } satisfies CartRecoveryRecord);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { enabled: true, sent, failed };
}
