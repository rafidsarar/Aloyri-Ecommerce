import { applyCrmSettlementEvent } from "@/lib/payment-settlement";
import type {
  RefundState,
  SettlementPaymentMethod,
  SettlementState,
} from "@/lib/payment-settlement-model";

export const dynamic = "force-dynamic";
const enc = new TextEncoder();

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(value: string) {
  return hex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))),
  );
}
async function hmacHex(secret: string, value: string) {
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
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}
async function verified(request: Request, body: string) {
  const id = process.env.CRM_INTEGRATION_ID || "";
  const secret = process.env.CRM_INTEGRATION_SECRET || "";
  const supplied = request.headers.get("x-aloyri-integration") || "";
  const ts = request.headers.get("x-aloyri-timestamp") || "";
  const nonce = request.headers.get("x-aloyri-nonce") || "";
  const sig = request.headers.get("x-aloyri-signature") || "";
  if (
    !id ||
    !secret ||
    supplied !== id ||
    !/^\d{10,13}$/.test(ts) ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(nonce) ||
    !/^[a-f0-9]{64}$/i.test(sig)
  ) return false;
  const numeric = Number(ts);
  const seconds = ts.length > 10 ? Math.floor(numeric / 1000) : numeric;
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) {
    return false;
  }
  const canonical = [
    "POST",
    "/api/integrations/crm/payment-settlement",
    id,
    ts,
    nonce,
    await sha256Hex(body),
  ].join("\n");
  return equal(await hmacHex(secret, canonical), sig.toLowerCase());
}

const states = new Set<SettlementState>([
  "pending",
  "authorized",
  "paid",
  "failed",
  "cancelled",
  "refund_pending",
  "partially_refunded",
  "refunded",
]);
const refundStates = new Set<RefundState>([
  "none",
  "requested",
  "processing",
  "partially_refunded",
  "refunded",
  "rejected",
  "not_required",
]);
const methods = new Set<SettlementPaymentMethod>(["COD", "bKash", "Nagad"]);

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 16000 || !(await verified(request, raw))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof body.eventId !== "string" ||
      !/^[A-Za-z0-9_-]{8,120}$/.test(body.eventId) ||
      typeof body.orderNumber !== "string" ||
      !/^WEB-[A-Z0-9-]{8,90}$/i.test(body.orderNumber) ||
      typeof body.paymentMethod !== "string" ||
      !methods.has(body.paymentMethod as SettlementPaymentMethod) ||
      typeof body.state !== "string" ||
      !states.has(body.state as SettlementState) ||
      typeof body.orderTotal !== "number" ||
      !Number.isFinite(body.orderTotal) ||
      body.orderTotal < 0
    ) {
      return Response.json({ error: "Invalid settlement event." }, { status: 400 });
    }
    if (
      body.refundedAmount !== undefined &&
      (typeof body.refundedAmount !== "number" ||
        !Number.isFinite(body.refundedAmount) ||
        body.refundedAmount < 0)
    ) {
      return Response.json({ error: "Invalid settlement event." }, { status: 400 });
    }
    if (
      body.refundState !== undefined &&
      (typeof body.refundState !== "string" ||
        !refundStates.has(body.refundState as RefundState))
    ) {
      return Response.json({ error: "Invalid settlement event." }, { status: 400 });
    }

    const result = await applyCrmSettlementEvent({
      eventId: body.eventId,
      orderNumber: body.orderNumber.toUpperCase(),
      paymentMethod: body.paymentMethod as SettlementPaymentMethod,
      state: body.state as SettlementState,
      orderTotal: body.orderTotal,
      ...(typeof body.refundedAmount === "number"
        ? { refundedAmount: body.refundedAmount }
        : {}),
      ...(typeof body.refundState === "string"
        ? { refundState: body.refundState as RefundState }
        : {}),
      ...(typeof body.providerTransactionId === "string"
        ? { providerTransactionId: body.providerTransactionId.slice(0, 160) }
        : {}),
    });

    return Response.json(
      {
        accepted: true,
        duplicate: result.duplicate,
        settlementState: result.record.state,
      },
      {
        status: result.duplicate ? 200 : 202,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "SETTLEMENT_EVENT_FAILED";
    if (code === "SETTLEMENT_NOT_FOUND") {
      return Response.json({ error: "Settlement not found.", code }, { status: 404 });
    }
    if (
      code === "INVALID_SETTLEMENT_TRANSITION" ||
      code === "INVALID_REFUND_AMOUNT"
    ) {
      return Response.json(
        { error: "Settlement event conflicts with current state.", code },
        { status: 409 },
      );
    }
    console.error("CRM settlement event failed", error);
    return Response.json(
      { error: "Settlement event failed.", code: "SETTLEMENT_EVENT_FAILED" },
      { status: 503 },
    );
  }
}
