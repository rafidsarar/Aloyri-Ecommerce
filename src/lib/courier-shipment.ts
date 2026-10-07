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
  canTransitionShipment,
  courierCodState,
  normalizeCourierAmount,
  providerLabel,
  publicFailureMessage,
  publicShipmentLabel,
  shipmentStateFromCrmStatus,
  validCourierCodAmounts,
  type CourierProvider,
  type DeliveryFailureReason,
  type ShipmentState,
} from "@/lib/courier-shipment-model";
import { courierProviderReadiness } from "@/lib/courier-provider-readiness";

const PREFIX = "delivery/shipments/";
const MAX_EVENTS = 80;

export type ShipmentEvent = {
  id: string;
  at: string;
  source: "checkout" | "crm" | "tracking";
  type: string;
  detail?: string;
  publicMessage?: string;
};

export type CourierShipmentRecord = {
  version: 1;
  id: string;
  orderNumber: string;
  externalOrderId?: string;
  crmOrderId?: string;
  orderTotal: number;
  paymentMethod: "COD" | "bKash" | "Nagad" | "Bank";
  provider: CourierProvider;
  trackingReference: string;
  state: ShipmentState;
  deliveryAttempts: number;
  failureReason?: DeliveryFailureReason;
  reattemptAt?: string;
  cod: {
    expectedAmount: number;
    collectedAmount: number;
    remittedAmount: number;
    state: ReturnType<typeof courierCodState>;
    remittanceReference?: string;
  };
  reconciliation: {
    state: "pending" | "matched" | "attention";
    issues: string[];
    lastCheckedAt?: string;
  };
  events: ShipmentEvent[];
  createdAt: string;
  updatedAt: string;
};

export type PublicShipmentTracking = {
  provider: string;
  state: ShipmentState;
  statusLabel: string;
  trackingReference: string;
  latestUpdate: string;
  latestMessage: string;
  deliveryAttempts: number;
  reattemptAt?: string;
  exceptionMessage?: string;
};

function pathFor(orderNumber: string) {
  return PREFIX + orderNumber.trim().toUpperCase() + ".json";
}

function event(
  source: ShipmentEvent["source"],
  type: string,
  detail?: string,
  publicMessage?: string,
  id = crypto.randomUUID(),
): ShipmentEvent {
  return {
    id,
    at: new Date().toISOString(),
    source,
    type,
    ...(detail ? { detail: detail.slice(0, 500) } : {}),
    ...(publicMessage ? { publicMessage: publicMessage.slice(0, 240) } : {}),
  };
}

function appendEvent(record: CourierShipmentRecord, next: ShipmentEvent) {
  return [...record.events, next].slice(-MAX_EVENTS);
}

export function courierShipmentReadiness() {
  return {
    datastoreReady: blobConfigured(),
    ...courierProviderReadiness(),
  };
}

export async function getCourierShipment(orderNumber: string) {
  if (!blobConfigured()) return null;
  return readPrivateJson<CourierShipmentRecord>(pathFor(orderNumber));
}

export async function recordShipmentIntent(input: {
  externalOrderId: string;
  crmOrderId: string;
  orderNumber: string;
  orderTotal: number;
  paymentMethod: "COD" | "bKash" | "Nagad" | "Bank";
}) {
  if (!blobConfigured()) return null;
  const pathname = pathFor(input.orderNumber);
  const existing = await readPrivateJson<CourierShipmentRecord>(pathname);
  if (existing) return existing;

  const now = new Date().toISOString();
  const total = normalizeCourierAmount(input.orderTotal);
  const isCod = input.paymentMethod === "COD";
  const record: CourierShipmentRecord = {
    version: 1,
    id: crypto.randomUUID().replace(/-/g, ""),
    orderNumber: input.orderNumber.trim().toUpperCase(),
    externalOrderId: input.externalOrderId,
    crmOrderId: input.crmOrderId,
    orderTotal: total,
    paymentMethod: input.paymentMethod,
    provider: "unassigned",
    trackingReference: "",
    state: "awaiting_fulfillment",
    deliveryAttempts: 0,
    cod: {
      expectedAmount: isCod ? total : 0,
      collectedAmount: 0,
      remittedAmount: 0,
      state: courierCodState({
        isCod,
        expectedAmount: isCod ? total : 0,
        collectedAmount: 0,
        remittedAmount: 0,
      }),
    },
    reconciliation: { state: "pending", issues: [] },
    events: [
      event(
        "checkout",
        "shipment.intent_created",
        "Shipment intelligence initialized after CRM-authoritative order creation.",
        "Aloyri is preparing your order.",
      ),
    ],
    createdAt: now,
    updatedAt: now,
  };
  await writePrivateJson(pathname, record);
  return record;
}

export async function reconcileShipmentFromTracking(input: {
  orderNumber: string;
  orderTotal: number;
  paymentMethod: "COD" | "bKash" | "Nagad" | "Bank";
  orderStatus: string;
  trackingReference: string;
}) {
  let record = await getCourierShipment(input.orderNumber);
  if (!record) {
    record = await recordShipmentIntent({
      externalOrderId: "legacy:" + input.orderNumber,
      crmOrderId: "",
      orderNumber: input.orderNumber,
      orderTotal: input.orderTotal,
      paymentMethod: input.paymentMethod,
    });
  }
  if (!record) return null;

  const issues: string[] = [];
  if (Math.abs(record.orderTotal - normalizeCourierAmount(input.orderTotal)) > 0.009) {
    issues.push("CRM order total does not match shipment record.");
  }
  if (record.paymentMethod !== input.paymentMethod) {
    issues.push("CRM payment method does not match shipment record.");
  }

  const mapped = shipmentStateFromCrmStatus(input.orderStatus);
  const nextState =
    mapped && canTransitionShipment(record.state, mapped) ? mapped : record.state;
  const nextTrackingReference =
    input.trackingReference.trim().slice(0, 160) || record.trackingReference;
  const changed =
    nextState !== record.state ||
    nextTrackingReference !== record.trackingReference ||
    JSON.stringify(issues) !== JSON.stringify(record.reconciliation.issues);

  const now = new Date().toISOString();
  const updated: CourierShipmentRecord = {
    ...record,
    state: nextState,
    trackingReference: nextTrackingReference,
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
            "shipment.tracking_reconciled",
            issues.join(" ") || "CRM order status reconciled with shipment intelligence.",
            nextState !== record.state ? publicShipmentLabel(nextState) : undefined,
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

export async function applyCrmCourierEvent(input: {
  eventId: string;
  orderNumber: string;
  orderTotal: number;
  paymentMethod: "COD" | "bKash" | "Nagad" | "Bank";
  provider: CourierProvider;
  state: ShipmentState;
  trackingReference?: string;
  collectedCodAmount?: number;
  remittedCodAmount?: number;
  remittanceReference?: string;
  failureReason?: DeliveryFailureReason;
  reattemptAt?: string;
  publicMessage?: string;
}) {
  let record = await getCourierShipment(input.orderNumber);
  if (!record) {
    record = await recordShipmentIntent({
      externalOrderId: "legacy:" + input.orderNumber,
      crmOrderId: "",
      orderNumber: input.orderNumber,
      orderTotal: input.orderTotal,
      paymentMethod: input.paymentMethod,
    });
  }
  if (!record) throw new Error("SHIPMENT_DATASTORE_UNAVAILABLE");
  if (record.events.some((row) => row.id === input.eventId)) {
    return { record, duplicate: true };
  }
  if (!canTransitionShipment(record.state, input.state)) {
    throw new Error("INVALID_SHIPMENT_TRANSITION");
  }

  const isCod = record.paymentMethod === "COD";
  const collectedAmount =
    input.collectedCodAmount === undefined
      ? record.cod.collectedAmount
      : normalizeCourierAmount(input.collectedCodAmount);
  const remittedAmount =
    input.remittedCodAmount === undefined
      ? record.cod.remittedAmount
      : normalizeCourierAmount(input.remittedCodAmount);

  if (
    !validCourierCodAmounts(
      record.cod.expectedAmount,
      collectedAmount,
      remittedAmount,
    )
  ) {
    throw new Error("INVALID_COD_AMOUNTS");
  }
  if (!isCod && (collectedAmount > 0 || remittedAmount > 0)) {
    throw new Error("COD_NOT_APPLICABLE");
  }
  if (
    input.state === "reattempt_scheduled" &&
    (!input.reattemptAt || Number.isNaN(Date.parse(input.reattemptAt)))
  ) {
    throw new Error("REATTEMPT_TIME_REQUIRED");
  }
  if (
    input.state === "delivery_failed" &&
    !input.failureReason
  ) {
    throw new Error("FAILURE_REASON_REQUIRED");
  }

  const issues: string[] = [];
  if (Math.abs(record.orderTotal - normalizeCourierAmount(input.orderTotal)) > 0.009) {
    issues.push("CRM courier event total does not match shipment record.");
  }
  if (record.paymentMethod !== input.paymentMethod) {
    issues.push("CRM courier event payment method does not match shipment record.");
  }

  const now = new Date().toISOString();
  const attempts =
    input.state === "delivery_failed"
      ? record.deliveryAttempts + 1
      : record.deliveryAttempts;
  const updated: CourierShipmentRecord = {
    ...record,
    provider: input.provider,
    state: input.state,
    trackingReference:
      input.trackingReference?.trim().slice(0, 160) || record.trackingReference,
    deliveryAttempts: attempts,
    ...(input.failureReason ? { failureReason: input.failureReason } : {}),
    ...(input.reattemptAt ? { reattemptAt: input.reattemptAt } : {}),
    cod: {
      ...record.cod,
      collectedAmount,
      remittedAmount,
      state: courierCodState({
        isCod,
        expectedAmount: record.cod.expectedAmount,
        collectedAmount,
        remittedAmount,
      }),
      ...(input.remittanceReference
        ? { remittanceReference: input.remittanceReference.slice(0, 160) }
        : {}),
    },
    reconciliation: {
      state: issues.length ? "attention" : "matched",
      issues,
      lastCheckedAt: now,
    },
    events: appendEvent(
      record,
      event(
        "crm",
        "shipment." + input.state,
        issues.join(" ") || "Signed CRM courier event applied.",
        input.publicMessage || publicShipmentLabel(input.state),
        input.eventId,
      ),
    ),
    updatedAt: now,
  };

  await writePrivateJson(pathFor(record.orderNumber), updated);
  await writeAdminAuditEvent(
    "crm-integration",
    "delivery.shipment." + input.state,
    "Signed CRM courier event applied for " + record.orderNumber + ".",
    { scope: "delivery", target: record.orderNumber },
  );
  return { record: updated, duplicate: false };
}

export function publicShipmentTracking(
  record: CourierShipmentRecord | null,
): PublicShipmentTracking | null {
  if (!record) return null;
  const latest = [...record.events]
    .reverse()
    .find((row) => row.publicMessage);
  return {
    provider: providerLabel(record.provider),
    state: record.state,
    statusLabel: publicShipmentLabel(record.state),
    trackingReference: record.trackingReference,
    latestUpdate: record.updatedAt,
    latestMessage: latest?.publicMessage || publicShipmentLabel(record.state),
    deliveryAttempts: record.deliveryAttempts,
    ...(record.reattemptAt ? { reattemptAt: record.reattemptAt } : {}),
    ...(record.failureReason
      ? { exceptionMessage: publicFailureMessage(record.failureReason) }
      : {}),
  };
}

export async function listCourierShipments(limit = 250) {
  if (!blobConfigured()) return [] as CourierShipmentRecord[];
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const storedPrefix = storefrontStoragePath(PREFIX);
  const result = await list({ prefix: storedPrefix, limit: safeLimit });
  const records = await Promise.all(
    result.blobs.map((blob) => {
      const logical = blob.pathname.startsWith(storedPrefix)
        ? PREFIX + blob.pathname.slice(storedPrefix.length)
        : blob.pathname;
      return readPrivateJson<CourierShipmentRecord>(logical);
    }),
  );
  return records
    .filter((row): row is CourierShipmentRecord => Boolean(row))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
