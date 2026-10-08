
import { volatileStorage } from "@/lib/volatile-storage";
export const CART_KEY = "aloyri_cart";
export const CART_UPDATED_EVENT = "aloyri-cart-updated";

export type CartItem = {
  productId: string;
  qty: number;
};

export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const quantities = new Map<string, number>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<CartItem>;
    if (typeof candidate.productId !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(candidate.productId)) continue;
    if (typeof candidate.qty !== "number" || !Number.isSafeInteger(candidate.qty) || candidate.qty < 1) continue;
    quantities.set(candidate.productId, Math.min(99, (quantities.get(candidate.productId) || 0) + candidate.qty));
    if (quantities.size >= 100) break;
  }
  return [...quantities].map(([productId, qty]) => ({ productId, qty }));
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(volatileStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
    return normalizeCart(raw);
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  volatileStorage.setItem(CART_KEY, JSON.stringify(normalizeCart(items)));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function cartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.qty, 0);
}
