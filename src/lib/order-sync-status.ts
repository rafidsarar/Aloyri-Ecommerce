type OrderSyncStatus = {
  state: "pending" | "completed" | "attention";
  error?: string;
  result?: unknown;
};

// CRM has definitively rejected these checkouts. They are retained for review,
// but must never be automatically resubmitted as new orders.
export function isRejectedCheckout(intent: OrderSyncStatus) {
  return intent.state === "attention" && !intent.result &&
    intent.error === "PROMOTION_NOT_AVAILABLE";
}
