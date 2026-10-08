import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createPrivateJsonOnce, readPrivateJson } from "@/lib/storefront-admin-store";

export const CART_HANDOFF_COOKIE = "aloyri_cart_oauth_handoff";
export const CART_HANDOFF_MAX_AGE_SECONDS = 20 * 60;
const PREFIX = "customer-auth/cart-handoff/";

export type HandoffItem = { productId: string; qty: number };
type HandoffRecord = {
  version: 1;
  items: HandoffItem[];
  expiresAt: string;
};

function validItem(value: unknown): value is HandoffItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HandoffItem>;
  return typeof item.productId === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(item.productId) &&
    typeof item.qty === "number" &&
    Number.isSafeInteger(item.qty) && item.qty >= 1 && item.qty <= 20;
}

export function cleanHandoffItems(value: unknown): HandoffItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;
  if (!value.every(validItem)) return null;
  if (new Set(value.map((item: HandoffItem) => item.productId)).size !== value.length) return null;
  if (value.reduce((count: number, item: HandoffItem) => count + item.qty, 0) > 100) return null;
  return value.map((item: HandoffItem) => ({
    productId: item.productId,
    qty: item.qty,
  }));
}

function pathFor(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const digest = createHash("sha256").update(token).digest("hex");
  return PREFIX + digest + ".json";
}

export async function storeHandoff(items: HandoffItem[]) {
  // Only product IDs and quantities are ever stored, never customer PII.
  const token = randomBytes(32).toString("base64url");
  const path = pathFor(token)!;
  const record: HandoffRecord = {
    version: 1,
    items,
    expiresAt: new Date(Date.now() + CART_HANDOFF_MAX_AGE_SECONDS * 1000).toISOString(),
  };
  if (!await createPrivateJsonOnce(path, record)) throw new Error("HANDOFF_CONFLICT");
  return token;
}

export async function loadHandoff(token: string): Promise<HandoffItem[] | null> {
  const path = pathFor(token);
  if (!path) return null;
  const record = await readPrivateJson<HandoffRecord>(path);
  if (!record || record.version !== 1 || !Number.isFinite(Date.parse(record.expiresAt)) ||
      Date.parse(record.expiresAt) <= Date.now()) return null;
  return cleanHandoffItems(record.items);
}
