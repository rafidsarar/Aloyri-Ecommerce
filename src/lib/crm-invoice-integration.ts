import { e2eCrmEndpointAllowed } from "@/lib/e2e-isolation";
import { unstable_rethrow } from "next/navigation";

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

export async function fetchCrmOrderInvoice(input: {
  orderNumber: string;
  phone: string;
}) {
  const baseUrl = process.env.CRM_INTEGRATION_URL?.replace(/\/$/, "");
  const integrationId = process.env.CRM_INTEGRATION_ID;
  const secret = process.env.CRM_INTEGRATION_SECRET;
  const protectionBypass = process.env.CRM_VERCEL_BYPASS_SECRET;

  if (!baseUrl || !integrationId || !secret || !e2eCrmEndpointAllowed(baseUrl)) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Invoice download is not configured yet.",
        code: "TRACKING_NOT_CONFIGURED",
      },
    };
  }

  const path = "/api/integrations/ecommerce/order-invoice";
  const body = JSON.stringify({ ...input, format: "pdf" });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const idempotencyKey = "invoice:" + nonce;
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

    const encoded = json.pdfBase64;
    const pdf = typeof encoded === "string" && encoded.length <= 12_000_000 && /^[A-Za-z0-9+/]+={0,2}$/.test(encoded) ? Buffer.from(encoded, "base64") : null;
    const safe = pdf && pdf.subarray(0, 5).toString("ascii") === "%PDF-" && json.orderNumber === input.orderNumber ? { pdf, orderNumber: input.orderNumber } : null;
    if (!safe) {
      return {
        ok: false as const,
        status: 503,
        body: {
          error: "Invoice download is temporarily unavailable.",
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
    console.error("CRM invoice request failed", error);
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Invoice download is temporarily unavailable.",
        code: "TRACKING_UNAVAILABLE",
      },
    };
  }
}
