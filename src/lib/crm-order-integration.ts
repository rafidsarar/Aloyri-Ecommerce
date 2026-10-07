import { recordRuntimeError } from "@/lib/runtime-error-store";
import { recordCrmSyncEvent } from "@/lib/crm-sync-hardening";

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

export type WebsiteOrderPayload = {
  externalOrderId: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    district: string;
    area: string;
    landmark?: string;
    notes?: string;
  };
  items: Array<{ productId: string; qty: number }>;
  promotionCode?: string;
  deliveryZone: "inside-dhaka" | "outside-dhaka";
  paymentMethod: "COD";
};

export type CrmOrderResult = {
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: "New";
  payment: "COD";
  productsSubtotal: number;
  discount: number;
  shippingDiscount: number;
  deliveryCharge: number;
  total: number;
  savings: number;
  promotion: null | {
    id: string;
    name: string;
    code: string;
    badgeText: string;
  };
  duplicate?: boolean;
};

export async function createCrmWebsiteOrder(payload: WebsiteOrderPayload) {
  const baseUrl = process.env.CRM_INTEGRATION_URL?.replace(/\/$/, "");
  const integrationId = process.env.CRM_INTEGRATION_ID;
  const secret = process.env.CRM_INTEGRATION_SECRET;
  const protectionBypass = process.env.CRM_VERCEL_BYPASS_SECRET;

  if (!baseUrl || !integrationId || !secret) {
    return {
      ok: false as const,
      status: 503,
      body: { error: "Website ordering is not configured yet.", code: "ORDERING_NOT_CONFIGURED" },
    };
  }

  const path = "/api/integrations/ecommerce/orders";
  const body = JSON.stringify(payload);
  const idempotencyKey = `checkout:${payload.externalOrderId}`;
  const bodyHash = await sha256Hex(body);
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();
    const canonical = ["POST", path, integrationId, timestamp, nonce, idempotencyKey, bodyHash].join("\n");
    const signature = await hmacSha256Hex(secret, canonical);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-aloyri-integration": integrationId,
      "x-aloyri-timestamp": timestamp,
      "x-aloyri-nonce": nonce,
      "x-aloyri-signature": signature,
      "idempotency-key": idempotencyKey,
    };
    if (protectionBypass) headers["x-vercel-protection-bypass"] = protectionBypass;

    try {
      const response = await fetch(baseUrl + path, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        result = { error: "The order service returned an invalid response.", code: "ORDER_SERVICE_ERROR" };
      }

      const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
      if (response.ok) {
        await recordCrmSyncEvent({
          kind: "order",
          state: "healthy",
          operation: "website-order-handoff",
          reference: payload.externalOrderId,
          attempt,
          status: response.status,
          detail: attempt > 1 ? "Order handoff recovered after retry." : "Order handoff accepted by CRM.",
        }).catch(() => undefined);
        return { ok: true as const, status: response.status, body: result as CrmOrderResult };
      }

      const errorBody = result as { error?: string; code?: string };
      if (!retryable || attempt === maxAttempts) {
        await recordCrmSyncEvent({
          kind: "order",
          state: "failed",
          operation: "website-order-handoff",
          reference: payload.externalOrderId,
          attempt,
          status: response.status,
          code: errorBody.code,
          detail: retryable ? "Retry budget exhausted." : "CRM rejected the order request.",
        }).catch(() => undefined);
        return { ok: false as const, status: response.status, body: errorBody };
      }

      await recordCrmSyncEvent({
        kind: "order",
        state: "retrying",
        operation: "website-order-handoff",
        reference: payload.externalOrderId,
        attempt,
        status: response.status,
        code: errorBody.code,
        detail: "Transient CRM response; retrying with the same idempotency key.",
      }).catch(() => undefined);
    } catch (error) {
      await recordRuntimeError("crm.order", error);
      if (attempt === maxAttempts) {
        await recordCrmSyncEvent({
          kind: "order",
          state: "failed",
          operation: "website-order-handoff",
          reference: payload.externalOrderId,
          attempt,
          code: "ORDER_SERVICE_UNAVAILABLE",
          detail: "Network retry budget exhausted.",
        }).catch(() => undefined);
        return {
          ok: false as const,
          status: 503,
          body: { error: "The order service is temporarily unavailable.", code: "ORDER_SERVICE_UNAVAILABLE" },
        };
      }
      await recordCrmSyncEvent({
        kind: "order",
        state: "retrying",
        operation: "website-order-handoff",
        reference: payload.externalOrderId,
        attempt,
        code: "ORDER_SERVICE_UNAVAILABLE",
        detail: "Transient network failure; retrying with the same idempotency key.",
      }).catch(() => undefined);
    }

    await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
  }

  return {
    ok: false as const,
    status: 503,
    body: { error: "The order service is temporarily unavailable.", code: "ORDER_SERVICE_UNAVAILABLE" },
  };
}
