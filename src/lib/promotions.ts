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

export type PromotionQuoteRequest = {
  items: Array<{ productId: string; qty: number }>;
  deliveryZone?: "inside-dhaka" | "outside-dhaka";
  code?: string;
};

export function salePriceFor(
  product: { price: number; salePrice?: number },
) {
  return typeof product.salePrice === "number" &&
    product.salePrice >= 0 &&
    product.salePrice < product.price
    ? product.salePrice
    : product.price;
}

export function hasSalePrice(
  product: { price: number; salePrice?: number },
) {
  return salePriceFor(product) < product.price;
}
