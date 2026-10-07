export type CourierProvider = "unassigned" | "pathao" | "steadfast" | "redx" | "other";

export type ShipmentState =
  | "awaiting_fulfillment"
  | "ready_for_courier"
  | "booked"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "reattempt_scheduled"
  | "return_to_origin"
  | "returned_to_origin"
  | "cancelled";

export type DeliveryFailureReason =
  | "customer_unreachable"
  | "customer_refused"
  | "address_issue"
  | "customer_rescheduled"
  | "cod_payment_issue"
  | "courier_operational_issue"
  | "weather_or_disruption"
  | "other";

export type CourierCodState =
  | "not_applicable"
  | "collection_pending"
  | "collected"
  | "remittance_pending"
  | "remitted"
  | "attention";

const transitions: Record<ShipmentState, ShipmentState[]> = {
  awaiting_fulfillment: ["ready_for_courier", "cancelled"],
  ready_for_courier: ["booked", "picked_up", "in_transit", "cancelled"],
  booked: ["picked_up", "in_transit", "cancelled"],
  picked_up: ["in_transit", "delivery_failed", "return_to_origin"],
  in_transit: ["out_for_delivery", "delivery_failed", "return_to_origin"],
  out_for_delivery: ["delivered", "delivery_failed", "return_to_origin"],
  delivered: [],
  delivery_failed: ["reattempt_scheduled", "out_for_delivery", "return_to_origin"],
  reattempt_scheduled: ["out_for_delivery", "delivery_failed", "return_to_origin"],
  return_to_origin: ["returned_to_origin"],
  returned_to_origin: [],
  cancelled: [],
};

export function canTransitionShipment(from: ShipmentState, to: ShipmentState) {
  return from === to || transitions[from].includes(to);
}

export function shipmentStateFromCrmStatus(status: string): ShipmentState | null {
  if (status === "Packed") return "ready_for_courier";
  if (status === "Shipped") return "in_transit";
  if (status === "Out for delivery") return "out_for_delivery";
  if (status === "Delivered") return "delivered";
  if (status === "Cancelled") return "cancelled";
  return null;
}

export function normalizeCourierAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_COURIER_AMOUNT");
  return Math.round(value * 100) / 100;
}

export function validCourierCodAmounts(
  expectedAmount: number,
  collectedAmount: number,
  remittedAmount: number,
) {
  const expected = normalizeCourierAmount(expectedAmount);
  const collected = normalizeCourierAmount(collectedAmount);
  const remitted = normalizeCourierAmount(remittedAmount);
  return collected <= expected + 0.009 && remitted <= collected + 0.009;
}

export function courierCodState(input: {
  isCod: boolean;
  expectedAmount: number;
  collectedAmount: number;
  remittedAmount: number;
}): CourierCodState {
  if (!input.isCod) return "not_applicable";
  const expected = normalizeCourierAmount(input.expectedAmount);
  const collected = normalizeCourierAmount(input.collectedAmount);
  const remitted = normalizeCourierAmount(input.remittedAmount);
  if (!validCourierCodAmounts(expected, collected, remitted)) return "attention";
  if (remitted + 0.009 >= expected && expected > 0) return "remitted";
  if (collected + 0.009 >= expected && expected > 0) return "remittance_pending";
  if (collected > 0) return "collected";
  return "collection_pending";
}

export function providerLabel(provider: CourierProvider) {
  if (provider === "pathao") return "Pathao Courier";
  if (provider === "steadfast") return "Steadfast Courier";
  if (provider === "redx") return "RedX";
  if (provider === "other") return "Courier partner";
  return "Courier not assigned";
}

export function publicShipmentLabel(state: ShipmentState) {
  const labels: Record<ShipmentState, string> = {
    awaiting_fulfillment: "Preparing your order",
    ready_for_courier: "Ready for courier",
    booked: "Courier booked",
    picked_up: "Picked up by courier",
    in_transit: "In transit",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    delivery_failed: "Delivery attempt unsuccessful",
    reattempt_scheduled: "Delivery reattempt scheduled",
    return_to_origin: "Returning to Aloyri",
    returned_to_origin: "Returned to Aloyri",
    cancelled: "Shipment cancelled",
  };
  return labels[state];
}

export function publicFailureMessage(reason?: DeliveryFailureReason) {
  const messages: Partial<Record<DeliveryFailureReason, string>> = {
    customer_unreachable: "The courier could not reach the recipient.",
    customer_refused: "The delivery was not accepted.",
    address_issue: "The courier needs help confirming the delivery address.",
    customer_rescheduled: "Delivery was rescheduled.",
    cod_payment_issue: "The courier could not complete Cash on Delivery collection.",
    courier_operational_issue: "The courier could not complete this delivery attempt.",
    weather_or_disruption: "Delivery was interrupted by an operational disruption.",
    other: "The courier could not complete this delivery attempt.",
  };
  return reason ? messages[reason] || "" : "";
}

export function codReconciliation(input: {
  isCod: boolean;
  expectedAmount: number;
  collectedAmount: number;
  remittedAmount: number;
  paymentSettlementState?: string;
}) {
  if (!input.isCod) {
    return { state: "not_applicable" as const, issues: [] as string[] };
  }

  const issues: string[] = [];
  const expected = normalizeCourierAmount(input.expectedAmount);
  const collected = normalizeCourierAmount(input.collectedAmount);
  const remitted = normalizeCourierAmount(input.remittedAmount);

  if (!validCourierCodAmounts(expected, collected, remitted)) {
    issues.push("Courier COD collected/remitted amounts are internally inconsistent.");
  }

  const courierFullyRemitted = Math.abs(remitted - expected) <= 0.009 && expected > 0;
  const paymentPaid = input.paymentSettlementState === "paid";

  if (courierFullyRemitted && !paymentPaid) {
    issues.push("Courier reports full COD remittance but CRM payment settlement is not marked paid.");
  }
  if (paymentPaid && !courierFullyRemitted) {
    issues.push("CRM payment settlement is paid but courier COD remittance is incomplete.");
  }

  return {
    state: issues.length
      ? ("attention" as const)
      : courierFullyRemitted && paymentPaid
        ? ("matched" as const)
        : ("pending" as const),
    issues,
  };
}
