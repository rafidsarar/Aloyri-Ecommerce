export const CART_KEY = "aloyri_cart";
export const CART_UPDATED_EVENT = "aloyri-cart-updated";

export type CartItem = {
  productId: string;
  qty: number;
};

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
    return Array.isArray(raw)
      ? raw.filter((item) => item && typeof item.productId === "string" && Number.isFinite(item.qty) && item.qty > 0)
      : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function cartCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.qty, 0);
}
