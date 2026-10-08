import type { CheckoutDraft } from "@/lib/checkout";
import type { PromotionQuote } from "@/lib/promotions";

export type CheckoutSavedAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  district: string;
  area: string;
  address: string;
  landmark?: string;
};

export type CheckoutAccount = {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  savedAddresses: CheckoutSavedAddress[];
};

/** A saved delivery address must be chosen explicitly; never auto-select its recipient. */
export function prefillCheckoutAccount(current: CheckoutDraft, account: CheckoutAccount): CheckoutDraft {
  return {
    ...current,
    email: account.email,
    fullName: current.fullName || account.displayName || "",
    phone: current.phone || account.phone || "",
  };
}

export function chooseCheckoutAddress(
  current: CheckoutDraft,
  account: CheckoutAccount,
  id: string,
): CheckoutDraft | null {
  if (!id) return current;
  const address = (account.savedAddresses || []).find((row) => row.id === id);
  if (!address) return null;
  return {
    ...current,
    fullName: address.recipientName,
    phone: address.phone,
    email: account.email,
    district: address.district,
    area: address.area,
    address: address.address,
    landmark: address.landmark || "",
    deliveryZone: address.district.trim().toLowerCase() === "dhaka" ? "inside-dhaka" : "outside-dhaka",
  };
}

export function checkoutQuoteKey(items: Array<{ productId: string; qty: number }>, deliveryZone: string, code: string) {
  return JSON.stringify({
    items: items.map((item) => [item.productId, item.qty]),
    deliveryZone,
    code: code.trim().toUpperCase(),
  });
}

/** Reject quotes for old carts, zones or codes; only a CRM-accepted code can be redeemed. */
export function promotionQuoteReady(
  currentKey: string,
  quotedKey: string,
  code: string,
  quote: PromotionQuote | null,
  error: string,
  loading: boolean,
): boolean {
  if (!currentKey || currentKey !== quotedKey || loading) return false;
  if (!code) return true;
  return !error && Boolean(
    quote?.codeApplied && quote.requestedCode.trim().toUpperCase() === code.trim().toUpperCase(),
  );
}
