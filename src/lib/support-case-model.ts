export type SupportCaseCategory =
  | "return"
  | "refund"
  | "delivery"
  | "payment"
  | "order"
  | "product"
  | "other";

export type SupportCaseStatus =
  | "new"
  | "reviewing"
  | "waiting-customer"
  | "waiting-operations"
  | "resolved"
  | "closed";

export type SupportPriority = "low" | "normal" | "high" | "urgent";

export type SupportSignal = {
  key: string;
  level: "info" | "warning" | "attention";
  label: string;
  detail: string;
};

export function suggestedSupportPriority(input: {
  category: SupportCaseCategory;
  reason?: string;
  preferredResolution?: string;
}) : SupportPriority {
  const reason = (input.reason || "").toLowerCase();
  if (
    input.category === "payment" ||
    reason.includes("damaged") ||
    reason.includes("wrong product") ||
    reason.includes("missing item") ||
    reason.includes("not received")
  ) {
    return "high";
  }
  if (
    input.category === "refund" ||
    input.preferredResolution === "Refund" ||
    input.category === "delivery"
  ) {
    return "high";
  }
  return "normal";
}

export function supportCaseIntelligence(input: {
  createdAt: string;
  status: SupportCaseStatus;
  category: SupportCaseCategory;
  preferredResolution?: string;
  paymentState?: string;
  refundState?: string;
  paymentReconciliation?: string;
  shipmentState?: string;
  shipmentReconciliation?: string;
  codState?: string;
}) {
  const signals: SupportSignal[] = [];
  const open = !["resolved", "closed"].includes(input.status);
  const ageHours = Math.max(
    0,
    (Date.now() - Date.parse(input.createdAt)) / (60 * 60 * 1000),
  );

  if (
    input.preferredResolution === "Refund" &&
    input.paymentState === "paid" &&
    !["refunded", "partially_refunded"].includes(input.paymentState || "")
  ) {
    signals.push({
      key: "refund-awaiting-settlement",
      level: "attention",
      label: "Refund settlement needs follow-up",
      detail: "The customer requested a refund and the payment ledger is still paid.",
    });
  }

  if (["requested", "processing"].includes(input.refundState || "")) {
    signals.push({
      key: "refund-in-progress",
      level: "warning",
      label: "Refund in progress",
      detail: "The refund ledger has not reached a final refunded or rejected state.",
    });
  }

  if (
    ["delivery_failed", "return_to_origin", "returned_to_origin"].includes(
      input.shipmentState || "",
    )
  ) {
    signals.push({
      key: "delivery-exception",
      level: "attention",
      label: "Delivery exception",
      detail: "Courier intelligence shows a failed-delivery or return-to-origin state.",
    });
  }

  if (
    input.paymentReconciliation === "attention" ||
    input.shipmentReconciliation === "attention" ||
    input.codState === "attention"
  ) {
    signals.push({
      key: "reconciliation",
      level: "attention",
      label: "Reconciliation mismatch",
      detail: "Payment, shipment or COD records need operations review before resolution.",
    });
  }

  if (open && ageHours >= 48) {
    signals.push({
      key: "sla",
      level: ageHours >= 96 ? "attention" : "warning",
      label: ageHours >= 96 ? "Case overdue" : "Case aging",
      detail:
        ageHours >= 96
          ? "This open case is more than four days old."
          : "This open case is more than two days old.",
    });
  }

  const attention = signals.some((signal) => signal.level === "attention");
  const warning = signals.some((signal) => signal.level === "warning");
  return {
    level: attention ? "attention" as const : warning ? "warning" as const : "clear" as const,
    signals,
    nextAction:
      signals.find((signal) => signal.level === "attention")?.label ||
      signals.find((signal) => signal.level === "warning")?.label ||
      (open ? "Review customer request" : "No active follow-up"),
  };
}
