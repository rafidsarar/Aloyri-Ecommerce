import { volatileStorage } from "@/lib/volatile-storage";
export const CART_KEY = "aloyri_cart";
export const CART_UPDATED_EVENT = "aloyri-cart-updated";

export type CartItem = { productId: string; qty: number };

const MAX_CART_ROWS = 60;
const MAX_LINE_QTY = 99;

/** Treat browser and recovery-cart data as untrusted; never let malformed rows reach checkout. */
export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const merged = new Map<string, number>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<CartItem>;
    if (
      typeof row.productId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(row.productId) ||
      typeof row.qty !== "number" ||
      !Number.isSafeInteger(row.qty) ||
      row.qty <= 0
    ) continue;
    if (!merged.has(row.productId) && merged.size >= MAX_CART_ROWS) continue;
    merged.set(row.productId, Math.min(MAX_LINE_QTY, (merged.get(row.productId) || 0) + row.qty));
  }
  return [...merged].map(([productId, qty]) => ({ productId, qty }));
}

export function mergeRecoveredCart(current: unknown, recovery: unknown): CartItem[] {
  const merged = new Map(normalizeCart(current).map(row => [row.productId, row.qty]));
  for (const row of normalizeCart(recovery)) {
    merged.set(row.productId, Math.max(row.qty, merged.get(row.productId) || 0));
  }
  return normalizeCart([...merged].map(([productId, qty]) => ({ productId, qty })));
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeCart(JSON.parse(volatileStorage.getItem(CART_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  volatileStorage.setItem(CART_KEY, JSON.stringify(normalizeCart(items)));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function cartCount(items: CartItem[]) {
  return normalizeCart(items).reduce((total, item) => total + item.qty, 0);
}
