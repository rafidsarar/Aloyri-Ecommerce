import { applyCrmCourierEvent } from "@/lib/courier-shipment";
import type {
  CourierProvider,
  DeliveryFailureReason,
  ShipmentState,
} from "@/lib/courier-shipment-model";

export const dynamic = "force-dynamic";
const enc = new TextEncoder();

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))));
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))));
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
    "/api/integrations/crm/courier-shipment",
    id,
    ts,
    nonce,
    await sha256Hex(body),
  ].join("\n");
  return equal(await hmacHex(secret, canonical), sig.toLowerCase());
}

const providers = new Set<CourierProvider>([
  "unassigned",
  "pathao",
  "steadfast",
  "redx",
  "other",
]);
const states = new Set<ShipmentState>([
  "awaiting_fulfillment",
  "ready_for_courier",
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "reattempt_scheduled",
  "return_to_origin",
  "returned_to_origin",
  "cancelled",
]);
const failures = new Set<DeliveryFailureReason>([
  "customer_unreachable",
  "customer_refused",
  "address_issue",
  "customer_rescheduled",
  "cod_payment_issue",
  "courier_operational_issue",
  "weather_or_disruption",
  "other",
]);
const paymentMethods = new Set(["COD", "bKash", "Nagad", "Bank"]);

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 18000 || !(await verified(request, raw))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof body.eventId !== "string" ||
      !/^[A-Za-z0-9_-]{8,120}$/.test(body.eventId) ||
      typeof body.orderNumber !== "string" ||
      !/^WEB-[A-Z0-9-]{8,90}$/i.test(body.orderNumber) ||
      typeof body.orderTotal !== "number" ||
      !Number.isFinite(body.orderTotal) ||
      body.orderTotal < 0 ||
      typeof body.paymentMethod !== "string" ||
      !paymentMethods.has(body.paymentMethod) ||
      typeof body.provider !== "string" ||
      !providers.has(body.provider as CourierProvider) ||
      typeof body.state !== "string" ||
      !states.has(body.state as ShipmentState)
    ) {
      return Response.json({ error: "Invalid courier event." }, { status: 400 });
    }

    const optionalMoney = ["collectedCodAmount", "remittedCodAmount"] as const;
    for (const key of optionalMoney) {
      if (
        body[key] !== undefined &&
        (typeof body[key] !== "number" ||
          !Number.isFinite(body[key]) ||
          body[key] < 0)
      ) {
        return Response.json({ error: "Invalid courier event." }, { status: 400 });
      }
    }
    if (
      body.failureReason !== undefined &&
      (typeof body.failureReason !== "string" ||
        !failures.has(body.failureReason as DeliveryFailureReason))
    ) {
      return Response.json({ error: "Invalid courier event." }, { status: 400 });
    }

    const result = await applyCrmCourierEvent({
      eventId: body.eventId,
      orderNumber: body.orderNumber.toUpperCase(),
      orderTotal: body.orderTotal,
      paymentMethod: body.paymentMethod as "COD" | "bKash" | "Nagad" | "Bank",
      provider: body.provider as CourierProvider,
      state: body.state as ShipmentState,
      ...(typeof body.trackingReference === "string"
        ? { trackingReference: body.trackingReference.slice(0, 160) }
        : {}),
      ...(typeof body.collectedCodAmount === "number"
        ? { collectedCodAmount: body.collectedCodAmount }
        : {}),
      ...(typeof body.remittedCodAmount === "number"
        ? { remittedCodAmount: body.remittedCodAmount }
        : {}),
      ...(typeof body.remittanceReference === "string"
        ? { remittanceReference: body.remittanceReference.slice(0, 160) }
        : {}),
      ...(typeof body.failureReason === "string"
        ? { failureReason: body.failureReason as DeliveryFailureReason }
        : {}),
      ...(typeof body.reattemptAt === "string"
        ? { reattemptAt: body.reattemptAt.slice(0, 64) }
        : {}),
      ...(typeof body.publicMessage === "string"
        ? { publicMessage: body.publicMessage.slice(0, 240) }
        : {}),
    });

    return Response.json(
      {
        accepted: true,
        duplicate: result.duplicate,
        shipmentState: result.record.state,
        codState: result.record.cod.state,
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
    const code = error instanceof Error ? error.message : "COURIER_EVENT_FAILED";
    if (
      [
        "INVALID_SHIPMENT_TRANSITION",
        "EVENT_ID_CONFLICT",
        "STALE_COD_EVENT",
        "INVALID_COD_AMOUNTS",
        "COD_NOT_APPLICABLE",
        "REATTEMPT_TIME_REQUIRED",
        "FAILURE_REASON_REQUIRED",
      ].includes(code)
    ) {
      return Response.json(
        { error: "Courier event conflicts with current shipment state.", code },
        { status: 409 },
      );
    }
    console.error("CRM courier event failed", error);
    return Response.json(
      { error: "Courier event failed.", code: "COURIER_EVENT_FAILED" },
      { status: 503 },
    );
  }
}
