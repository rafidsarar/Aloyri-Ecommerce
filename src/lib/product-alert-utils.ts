export type ProductAlertKind = "back-in-stock" | "price-drop";

export function productAlertTriggers(input: {
  kinds: ProductAlertKind[];
  baselinePrice: number;
  baselineStock: number;
  currentPrice: number;
  currentStock: number;
}) {
  const triggered: ProductAlertKind[] = [];
  if (
    input.kinds.includes("back-in-stock") &&
    input.baselineStock <= 0 &&
    input.currentStock > 0
  ) {
    triggered.push("back-in-stock");
  }
  if (
    input.kinds.includes("price-drop") &&
    Number.isFinite(input.baselinePrice) &&
    Number.isFinite(input.currentPrice) &&
    input.currentPrice < input.baselinePrice
  ) {
    triggered.push("price-drop");
  }
  return triggered;
}
