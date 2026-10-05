const enc = new TextEncoder();

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function sha256Hex(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))));
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))));
}

export type ReturnRequestInput = {
  orderNumber: string;
  phone: string;
  reason:
    | "Wrong product delivered"
    | "Damaged on arrival"
    | "Missing item"
    | "Product issue"
    | "Changed mind"
    | "Other";
  condition:
    | "Unopened"
    | "Opened"
    | "Damaged in delivery"
    | "Not received"
    | "Other";
  preferredResolution: "Refund" | "Replacement" | "Store credit" | "Other";
  note: string;
  items: Array<{ line: number; qty: number }>;
};

export async function submitCrmReturnRequest(input: ReturnRequestInput) {
  const baseUrl = process.env.CRM_INTEGRATION_URL?.replace(/\/$/, "");
  const integrationId = process.env.CRM_INTEGRATION_ID;
  const secret = process.env.CRM_INTEGRATION_SECRET;
  const protectionBypass = process.env.CRM_VERCEL_BYPASS_SECRET;

  if (!baseUrl || !integrationId || !secret) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Return requests are not configured yet.",
        code: "RETURN_REQUEST_NOT_CONFIGURED",
      },
    };
  }

  const path = "/api/integrations/ecommerce/return-requests";
  const body = JSON.stringify(input);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex(body);
  const idempotencyKey =
    "return:" + input.orderNumber + ":" + bodyHash.slice(0, 40);
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
    return {
      ok: response.ok,
      status: response.status,
      body: {
        requestId: typeof json.requestId === "string" ? json.requestId : "",
        orderNumber: typeof json.orderNumber === "string" ? json.orderNumber : "",
        status: typeof json.status === "string" ? json.status : "",
        duplicate: json.duplicate === true,
        error: typeof json.error === "string" ? json.error : undefined,
        code: typeof json.code === "string" ? json.code : undefined,
      },
    } as const;
  } catch (error) {
    console.error("CRM return request failed", error);
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Return requests are temporarily unavailable.",
        code: "RETURN_REQUEST_UNAVAILABLE",
      },
    };
  }
}
