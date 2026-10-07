import { recordRuntimeError } from "@/lib/runtime-error-store";

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

export type WebsiteCustomerAccountPayload = {
  accountId: string;
  email: string;
  name: string;
  phone: string;
  address?: string;
  district?: string;
  consent?: boolean;
  createdAt?: string;
};

export type CrmCustomerAccountResult = {
  customerId: string;
  accountId: string;
  created: boolean;
  linked: true;
};

export async function syncCustomerAccountToCrm(
  payload: WebsiteCustomerAccountPayload,
) {
  const baseUrl = process.env.CRM_INTEGRATION_URL?.replace(/\/$/, "");
  const integrationId = process.env.CRM_INTEGRATION_ID;
  const secret = process.env.CRM_INTEGRATION_SECRET;
  const protectionBypass = process.env.CRM_VERCEL_BYPASS_SECRET;

  if (!baseUrl || !integrationId || !secret) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Customer sync is not configured yet.",
        code: "CUSTOMER_SYNC_NOT_CONFIGURED",
      },
    };
  }

  const path = "/api/integrations/ecommerce/customers";
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const idempotencyKey = "customer-account:" + payload.accountId;
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
      result = { error: "CRM customer service returned an invalid response.", code: "CUSTOMER_SYNC_FAILED" };
    }
    return {
      ok: response.ok,
      status: response.status,
      body: result,
    } as
      | { ok: true; status: number; body: CrmCustomerAccountResult }
      | { ok: false; status: number; body: { error?: string; code?: string } };
  } catch (error) {
    console.error("CRM customer account sync failed", error);
    await recordRuntimeError("crm.customer-account", error);
    return {
      ok: false as const,
      status: 503,
      body: {
        error: "Customer sync is temporarily unavailable.",
        code: "CUSTOMER_SYNC_UNAVAILABLE",
      },
    };
  }
}
