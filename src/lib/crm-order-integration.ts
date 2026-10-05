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
      body: {
        error: "Website ordering is not configured yet.",
        code: "ORDERING_NOT_CONFIGURED",
      },
    };
  }

  const path = "/api/integrations/ecommerce/orders";
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const idempotencyKey = `checkout:${payload.externalOrderId}`;
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
      signal: AbortSignal.timeout(12_000),
    });

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      result = {
        error: "The order service returned an invalid response.",
        code: "ORDER_SERVICE_ERROR",
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      body: result,
    } as
      | { ok: true; status: number; body: CrmOrderResult }
      | {
          ok: false;
          status: number;
          body: { error?: string; code?: string };
        };
  } catch (error) {
    console.error("CRM website order request failed", error);
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "The order service is temporarily unavailable.",
        code: "ORDER_SERVICE_UNAVAILABLE",
      },
    };
  }
}
