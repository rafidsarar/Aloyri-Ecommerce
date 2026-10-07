import { unstable_rethrow } from "next/navigation";
import type {
  PromotionQuote,
  PromotionQuoteRequest,
} from "@/lib/promotions";

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
    new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))),
  );
}

export async function quoteCrmPromotion(payload: PromotionQuoteRequest) {
  const baseUrl = process.env.CRM_INTEGRATION_URL?.replace(/\/$/, "");
  const integrationId = process.env.CRM_INTEGRATION_ID;
  const secret = process.env.CRM_INTEGRATION_SECRET;
  const protectionBypass = process.env.CRM_VERCEL_BYPASS_SECRET;

  if (!baseUrl || !integrationId || !secret) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Promotions are not configured yet.",
        code: "PROMOTIONS_NOT_CONFIGURED",
      },
    };
  }

  const path = "/api/integrations/ecommerce/promotions/quote";
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const idempotencyKey = `promotion-quote:${nonce}`;
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

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      result = {
        error: "The promotion service returned an invalid response.",
        code: "PROMOTION_SERVICE_ERROR",
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      body: result,
    } as
      | { ok: true; status: number; body: PromotionQuote }
      | {
          ok: false;
          status: number;
          body: { error?: string; code?: string };
        };
  } catch (error) {
    unstable_rethrow(error);
    console.error("CRM promotion quote request failed", error);
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Promotion pricing is temporarily unavailable.",
        code: "PROMOTION_SERVICE_UNAVAILABLE",
      },
    };
  }
}
