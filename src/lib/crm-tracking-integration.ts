import { unstable_rethrow } from "next/navigation";
import type { PublicShipmentTracking } from "@/lib/courier-shipment";

const enc = new TextEncoder();

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function sha256Hex(value: string) {
  return hex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))),
  );
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(value)),
    ),
  );
}

export type TrackingStatus =
  | "New"
  | "Confirmed"
  | "Ready to pack"
  | "Packed"
  | "Shipped"
  | "Out for delivery"
  | "Delivered"
  | "Returned"
  | "Cancelled";

export type PublicTrackedOrder = {
  orderNumber: string;
  created: string;
  status: TrackingStatus;
  paymentMethod: "COD" | "bKash" | "Nagad" | "Bank";
  items: Array<{
    name: string;
    brand: string;
    size: string;
    qty: number;
    unitPrice: number;
  }>;
  productsSubtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  trackingReference: string;
  deliveredDate: string;
  returnedDate: string;
  shipment?: PublicShipmentTracking | null;
};

function safeTrackedOrder(value: unknown): PublicTrackedOrder | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const validStatuses: TrackingStatus[] = [
    "New",
    "Confirmed",
    "Ready to pack",
    "Packed",
    "Shipped",
    "Out for delivery",
    "Delivered",
    "Returned",
    "Cancelled",
  ];
  const validPayments = ["COD", "bKash", "Nagad", "Bank"] as const;

  if (
    typeof input.orderNumber !== "string" ||
    typeof input.created !== "string" ||
    typeof input.status !== "string" ||
    !validStatuses.includes(input.status as TrackingStatus) ||
    typeof input.paymentMethod !== "string" ||
    !validPayments.includes(input.paymentMethod as (typeof validPayments)[number]) ||
    !Array.isArray(input.items) ||
    typeof input.productsSubtotal !== "number" ||
    typeof input.discount !== "number" ||
    typeof input.deliveryCharge !== "number" ||
    typeof input.total !== "number" ||
    typeof input.trackingReference !== "string" ||
    typeof input.deliveredDate !== "string" ||
    typeof input.returnedDate !== "string"
  ) {
    return null;
  }

  const items = input.items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (
        typeof row.name !== "string" ||
        typeof row.brand !== "string" ||
        typeof row.size !== "string" ||
        typeof row.qty !== "number" ||
        !Number.isInteger(row.qty) ||
        row.qty < 1 ||
        typeof row.unitPrice !== "number" ||
        row.unitPrice < 0
      ) {
        return null;
      }
      return {
        name: row.name,
        brand: row.brand,
        size: row.size,
        qty: row.qty,
        unitPrice: row.unitPrice,
      };
    })
    .filter((item): item is PublicTrackedOrder["items"][number] => Boolean(item));

  if (items.length !== input.items.length || items.length === 0) return null;

  return {
    orderNumber: input.orderNumber,
    created: input.created,
    status: input.status as TrackingStatus,
    paymentMethod: input.paymentMethod as PublicTrackedOrder["paymentMethod"],
    items,
    productsSubtotal: input.productsSubtotal,
    discount: input.discount,
    deliveryCharge: input.deliveryCharge,
    total: input.total,
    trackingReference: input.trackingReference,
    deliveredDate: input.deliveredDate,
    returnedDate: input.returnedDate,
  };
}

export async function fetchCrmOrderTracking(input: {
  orderNumber: string;
  phone: string;
}) {
  const baseUrl = process.env.CRM_INTEGRATION_URL?.replace(/\/$/, "");
  const integrationId = process.env.CRM_INTEGRATION_ID;
  const secret = process.env.CRM_INTEGRATION_SECRET;
  const protectionBypass = process.env.CRM_VERCEL_BYPASS_SECRET;

  if (!baseUrl || !integrationId || !secret) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Order tracking is not configured yet.",
        code: "TRACKING_NOT_CONFIGURED",
      },
    };
  }

  const path = "/api/integrations/ecommerce/order-tracking";
  const body = JSON.stringify(input);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const idempotencyKey = "track:" + nonce;
  const bodyHash = await sha256Hex(body);
  const canonical = [
    "POST",
    path,
    integrationId,
    timestamp,
    nonce,
    idempotencyKey,
    bodyHash,
  ].join("\n");
  const signature = await hmacSha256Hex(secret, canonical);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-aloyri-integration": integrationId,
    "x-aloyri-timestamp": timestamp,
    "x-aloyri-nonce": nonce,
    "x-aloyri-signature": signature,
    "idempotency-key": idempotencyKey,
  };

  if (protectionBypass) {
    headers["x-vercel-protection-bypass"] = protectionBypass;
  }

  try {
    const response = await fetch(baseUrl + path, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        body: {
          error:
            typeof json.error === "string"
              ? json.error
              : "Check the order number and mobile number and try again.",
          code:
            typeof json.code === "string"
              ? json.code
              : "TRACKING_NOT_FOUND",
        },
      };
    }

    const safe = safeTrackedOrder(json);
    if (!safe) {
      return {
        ok: false as const,
        status: 503,
        body: {
          error: "Order tracking is temporarily unavailable.",
          code: "TRACKING_UNAVAILABLE",
        },
      };
    }

    return {
      ok: true as const,
      status: 200,
      body: safe,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("CRM order tracking request failed", error);
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Order tracking is temporarily unavailable.",
        code: "TRACKING_UNAVAILABLE",
      },
    };
  }
}
