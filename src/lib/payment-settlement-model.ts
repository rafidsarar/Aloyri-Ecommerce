export type SettlementPaymentMethod = "COD" | "bKash" | "Nagad";
export type PaymentProvider = "cash-on-delivery" | "bkash" | "nagad";
export type SettlementState = "pending" | "authorized" | "paid" | "failed" | "cancelled" | "refund_pending" | "partially_refunded" | "refunded";
export type RefundState = "none" | "requested" | "processing" | "partially_refunded" | "refunded" | "rejected" | "not_required";

const transitions: Record<SettlementState, SettlementState[]> = {
  pending: ["authorized", "paid", "failed", "cancelled"],
  authorized: ["paid", "failed", "cancelled"],
  paid: ["refund_pending"],
  failed: ["pending", "cancelled"],
  cancelled: [],
  refund_pending: ["partially_refunded", "refunded", "paid"],
  partially_refunded: ["refund_pending", "refunded"],
  refunded: [],
};

export function paymentProviderFor(method: SettlementPaymentMethod): PaymentProvider {
  if (method === "bKash") return "bkash";
  if (method === "Nagad") return "nagad";
  return "cash-on-delivery";
}

export function canTransitionSettlement(from: SettlementState, to: SettlementState) {
  return from === to || transitions[from].includes(to);
}

export function normalizeBdt(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_PAYMENT_AMOUNT");
  return Math.round(value * 100) / 100;
}

export function validRefundAmount(orderTotal: number, refundedAmount: number) {
  return normalizeBdt(refundedAmount) <= normalizeBdt(orderTotal);
}

export function refundAmountMatchesSettlementState(
  state: SettlementState,
  orderTotal: number,
  refundedAmount: number,
) {
  if (!validRefundAmount(orderTotal, refundedAmount)) return false;
  const total = normalizeBdt(orderTotal);
  const refunded = normalizeBdt(refundedAmount);
  if (state === "refunded") return Math.abs(total - refunded) <= 0.009;
  if (state === "partially_refunded") {
    return refunded > 0 && refunded + 0.009 < total;
  }
  return true;
}

export function refundStateForAmount(orderTotal: number, refundedAmount: number): RefundState {
  const total = normalizeBdt(orderTotal);
  const refunded = normalizeBdt(refundedAmount);
  if (refunded <= 0) return "processing";
  return refunded + 0.009 >= total ? "refunded" : "partially_refunded";
}
