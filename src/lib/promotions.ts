import type { DeliveryZone } from "@/lib/checkout";

export const PROMOTION_CODE_KEY = "aloyri_promotion_code";

export type PromotionQuote = {
  productsSubtotal: number;
  discount: number;
  discountedSubtotal: number;
  deliveryChargeBeforeDiscount: number;
  shippingDiscount: number;
  deliveryCharge: number;
  total: number;
  savings: number;
  requestedCode: string;
  codeApplied: boolean;
  promotion: null | {
    id: string;
    name: string;
    code: string;
    badgeText: string;
    kind: "percentage" | "fixed";
    value: number;
    freeShipping: boolean;
  };
};

export type PromotionQuoteItem = {
  productId: string;
  qty: number;
};

export function normalizePromotionCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

export async function requestPromotionQuote(input: {
  items: PromotionQuoteItem[];
  deliveryZone?: DeliveryZone | "";
  code?: string;
}) {
  const response = await fetch("/api/promotions/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      items: input.items,
      ...(input.deliveryZone ? { deliveryZone: input.deliveryZone } : {}),
      code: normalizePromotionCode(input.code || ""),
    }),
  });

  const data = (await response.json()) as PromotionQuote & {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    const error = new Error(
      data.error || "Promotion pricing is temporarily unavailable.",
    ) as Error & { code?: string };
    error.code = data.code;
    throw error;
  }

  return data as PromotionQuote;
}

export function readPromotionCode() {
  if (typeof window === "undefined") return "";
  try {
    return normalizePromotionCode(sessionStorage.getItem(PROMOTION_CODE_KEY) || "");
  } catch {
    return "";
  }
}

export function writePromotionCode(value: string) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizePromotionCode(value);
    if (normalized) sessionStorage.setItem(PROMOTION_CODE_KEY, normalized);
    else sessionStorage.removeItem(PROMOTION_CODE_KEY);
  } catch {
    // Promotions continue to work without browser storage.
  }
}
