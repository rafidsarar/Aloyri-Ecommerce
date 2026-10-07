import "server-only";

import { list } from "@vercel/blob";
import {
  blobConfigured,
  readPrivateJson,
  storefrontStoragePath,
  writeAdminAuditEvent,
  writePrivateJson,
} from "@/lib/storefront-admin-store";
import {
  canTransitionSettlement,
  normalizeBdt,
  paymentProviderFor,
  refundAmountMatchesSettlementState,
  refundStateForAmount,
  type RefundState,
  type SettlementPaymentMethod,
  type SettlementState,
} from "@/lib/payment-settlement-model";
import { paymentProviderReadiness } from "@/lib/payment-provider-readiness";

const PREFIX = "payments/settlements/";
const MAX_EVENTS = 50;

export type SettlementEvent = {
  id: string;
  at: string;
  source: "checkout" | "crm" | "tracking" | "return";
  type: string;
  detail?: string;
};

export type PaymentSettlementRecord = {
  version: 1;
  id: string;
  externalOrderId: string;
  crmOrderId: string;
  orderNumber: string;
  method: SettlementPaymentMethod;
  provider: ReturnType<typeof paymentProviderFor>;
  currency: "BDT";
  orderTotal: number;
  state: SettlementState;
  refundState: RefundState;
  refundedAmount: number;
  returnRequestId?: string;
  providerTransactionId?: string;
  reconciliation: {
    state: "pending" | "matched" | "attention";
    issues: string[];
    lastCheckedAt?: string;
  };
  events: SettlementEvent[];
  createdAt: string;
  updatedAt: string;
};

function pathFor(orderNumber: string) {
  return PREFIX + orderNumber.trim().toUpperCase() + ".json";
}

function event(
  source: SettlementEvent["source"],
  type: string,
  detail?: string,
  id = crypto.randomUUID(),
): SettlementEvent {
  return {
    id,
    at: new Date().toISOString(),
    source,
    type,
    ...(detail ? { detail: detail.slice(0, 300) } : {}),
  };
}

function appendEvent(record: PaymentSettlementRecord, next: SettlementEvent) {
  return [...record.events, next].slice(-MAX_EVENTS);
}

export function paymentSettlementReadiness() {
  return { datastoreReady: blobConfigured(), ...paymentProviderReadiness() };
}

export async function getPaymentSettlement(orderNumber: string) {
  if (!blobConfigured()) return null;
  return readPrivateJson<PaymentSettlementRecord>(pathFor(orderNumber));
}

export async function recordOrderSettlement(input: {
  externalOrderId: string;
  crmOrderId: string;
  orderNumber: string;
  method: SettlementPaymentMethod;
  orderTotal: number;
}) {
  if (!blobConfigured()) return null;
  const pathname = pathFor(input.orderNumber);
  const existing = await readPrivateJson<PaymentSettlementRecord>(pathname);
  const amount = normalizeBdt(input.orderTotal);

  if (existing) {
    const issues = [...existing.reconciliation.issues];
    if (
      Math.abs(existing.orderTotal - amount) > 0.009 &&
      !issues.includes("Order total changed for an existing settlement.")
    ) {
      issues.push("Order total changed for an existing settlement.");
    }
    if (
      existing.method !== input.method &&
      !issues.includes("Payment method changed for an existing settlement.")
    ) {
      issues.push("Payment method changed for an existing settlement.");
    }
    if (issues.length !== existing.reconciliation.issues.length) {
      const now = new Date().toISOString();
      const updated: PaymentSettlementRecord = {
        ...existing,
        reconciliation: { state: "attention", issues, lastCheckedAt: now },
        events: appendEvent(existing, event("checkout", "settlement.mismatch", issues.join(" "))),
        updatedAt: now,
      };
      await writePrivateJson(pathname, updated);
      return updated;
    }
    return existing;
  }

  const now = new Date().toISOString();
  const record: PaymentSettlementRecord = {
    version: 1,
    id: crypto.randomUUID().replace(/-/g, ""),
    externalOrderId: input.externalOrderId,
    crmOrderId: input.crmOrderId,
    orderNumber: input.orderNumber.trim().toUpperCase(),
    method: input.method,
    provider: paymentProviderFor(input.method),
    currency: "BDT",
    orderTotal: amount,
    state: "pending",
    refundState: "none",
    refundedAmount: 0,
    reconciliation: { state: "pending", issues: [] },
    events: [
      event(
        "checkout",
        "settlement.created",
        input.method === "COD"
          ? "Cash collection due on delivery."
          : "Online payment pending.",
      ),
    ],
    createdAt: now,
    updatedAt: now,
  };
  await writePrivateJson(pathname, record);
  return record;
}

export async function reconcileSettlementFromTracking(input: {
  orderNumber: string;
  paymentMethod: SettlementPaymentMethod | "Bank";
  total: number;
  orderStatus: string;
}) {
  const record = await getPaymentSettlement(input.orderNumber);
  if (!record) return null;

  const issues: string[] = [];
  if (input.paymentMethod !== record.method) {
    issues.push("CRM payment method does not match website settlement.");
  }
  if (Math.abs(normalizeBdt(input.total) - record.orderTotal) > 0.009) {
    issues.push("CRM order total does not match website settlement.");
  }

  let state = record.state;
  if (
    input.orderStatus === "Cancelled" &&
    canTransitionSettlement(record.state, "cancelled")
  ) {
    state = "cancelled";
  }

  const now = new Date().toISOString();
  const changed =
    state !== record.state ||
    JSON.stringify(issues) !== JSON.stringify(record.reconciliation.issues);

  const updated: PaymentSettlementRecord = {
    ...record,
    state,
    reconciliation: {
      state: issues.length ? "attention" : "matched",
      issues,
      lastCheckedAt: now,
    },
    events: changed
      ? appendEvent(
          record,
          event(
            "tracking",
            issues.length ? "reconciliation.attention" : "reconciliation.matched",
            issues.join(" ") ||
              "CRM order total and payment method match the website settlement.",
          ),
        )
      : record.events,
    updatedAt: changed ? now : record.updatedAt,
  };

  if (changed || !record.reconciliation.lastCheckedAt) {
    await writePrivateJson(pathFor(record.orderNumber), updated);
  }
  return updated;
}

export async function noteReturnRequest(input: {
  orderNumber: string;
  requestId: string;
  preferredResolution: string;
}) {
  const record = await getPaymentSettlement(input.orderNumber);
  if (!record) return null;
  const wantsRefund = input.preferredResolution === "Refund";
  const refundState: RefundState = wantsRefund ? "requested" : "not_required";
  const state: SettlementState =
    wantsRefund &&
    record.state === "paid" &&
    canTransitionSettlement(record.state, "refund_pending")
      ? "refund_pending"
      : record.state;
  const now = new Date().toISOString();
  const updated: PaymentSettlementRecord = {
    ...record,
    state,
    refundState,
    returnRequestId: input.requestId || record.returnRequestId,
    events: appendEvent(
      record,
      event(
        "return",
        wantsRefund ? "refund.requested" : "return.no_refund_requested",
        input.requestId ? "Return request " + input.requestId : undefined,
      ),
    ),
    updatedAt: now,
  };
  await writePrivateJson(pathFor(record.orderNumber), updated);
  return updated;
}

export async function applyCrmSettlementEvent(input: {
  eventId: string;
  orderNumber: string;
  paymentMethod: SettlementPaymentMethod;
  state: SettlementState;
  orderTotal: number;
  refundedAmount?: number;
  refundState?: RefundState;
  providerTransactionId?: string;
}) {
  const record = await getPaymentSettlement(input.orderNumber);
  if (!record) throw new Error("SETTLEMENT_NOT_FOUND");
  if (record.events.some((row) => row.id === input.eventId)) {
    return { record, duplicate: true };
  }
  if (!canTransitionSettlement(record.state, input.state)) {
    throw new Error("INVALID_SETTLEMENT_TRANSITION");
  }

  const orderTotal = normalizeBdt(input.orderTotal);
  const refundedAmount =
    input.refundedAmount === undefined
      ? record.refundedAmount
      : normalizeBdt(input.refundedAmount);
  if (
    !refundAmountMatchesSettlementState(
      input.state,
      record.orderTotal,
      refundedAmount,
    )
  ) {
    throw new Error("INVALID_REFUND_AMOUNT");
  }

  const issues: string[] = [];
  if (record.method !== input.paymentMethod) {
    issues.push("CRM payment method does not match website settlement.");
  }
  if (Math.abs(record.orderTotal - orderTotal) > 0.009) {
    issues.push("CRM settlement total does not match website order total.");
  }

  let refundState = input.refundState ?? record.refundState;
  if (input.state === "refunded" || input.state === "partially_refunded") {
    refundState = refundStateForAmount(record.orderTotal, refundedAmount);
  } else if (input.state === "refund_pending" && refundState === "none") {
    refundState = "processing";
  }

  const now = new Date().toISOString();
  const updated: PaymentSettlementRecord = {
    ...record,
    state: input.state,
    refundState,
    refundedAmount,
    ...(input.providerTransactionId
      ? { providerTransactionId: input.providerTransactionId.slice(0, 160) }
      : {}),
    reconciliation: {
      state: issues.length ? "attention" : "matched",
      issues,
      lastCheckedAt: now,
    },
    events: appendEvent(
      record,
      event(
        "crm",
        "settlement." + input.state,
        issues.join(" ") || "Signed CRM settlement event applied.",
        input.eventId,
      ),
    ),
    updatedAt: now,
  };

  await writePrivateJson(pathFor(record.orderNumber), updated);
  await writeAdminAuditEvent(
    "crm-integration",
    "payment.settlement." + input.state,
    "Signed CRM settlement event applied for " + record.orderNumber + ".",
    { scope: "payments", target: record.orderNumber },
  );
  return { record: updated, duplicate: false };
}

export async function listPaymentSettlements(limit = 250) {
  if (!blobConfigured()) return [] as PaymentSettlementRecord[];
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const storedPrefix = storefrontStoragePath(PREFIX);
  const result = await list({ prefix: storedPrefix, limit: safeLimit });
  const records = await Promise.all(
    result.blobs.map((blob) => {
      const logical = blob.pathname.startsWith(storedPrefix)
        ? PREFIX + blob.pathname.slice(storedPrefix.length)
        : blob.pathname;
      return readPrivateJson<PaymentSettlementRecord>(logical);
    }),
  );
  return records
    .filter((row): row is PaymentSettlementRecord => Boolean(row))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
