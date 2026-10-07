import { enqueueDeliveredLifecycleEvent } from "@/lib/lifecycle-email-queue";
import { lifecycleReadiness } from "@/lib/lifecycle-orchestration";

export const dynamic = "force-dynamic";
const enc = new TextEncoder();

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))));
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))));
}
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verified(request: Request, body: string) {
  const id = process.env.CRM_INTEGRATION_ID || "";
  const secret = process.env.CRM_INTEGRATION_SECRET || "";
  const supplied = request.headers.get("x-aloyri-integration") || "";
  const ts = request.headers.get("x-aloyri-timestamp") || "";
  const nonce = request.headers.get("x-aloyri-nonce") || "";
  const sig = request.headers.get("x-aloyri-signature") || "";
  if (!id || !secret || supplied !== id || !/^\d{10,13}$/.test(ts) || !/^[A-Za-z0-9_-]{8,100}$/.test(nonce) || !/^[a-f0-9]{64}$/i.test(sig)) return false;
  const numeric = Number(ts);
  const seconds = ts.length > 10 ? Math.floor(numeric / 1000) : numeric;
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const canonical = ["POST","/api/integrations/crm/lifecycle",id,ts,nonce,await sha256Hex(body)].join("\n");
  return equal(await hmacHex(secret, canonical), sig.toLowerCase());
}

export async function POST(request: Request) {
  if (!lifecycleReadiness().lifecycleEnabled) {
    return Response.json({ error: "Lifecycle automation is not active.", code: "LIFECYCLE_NOT_READY" }, { status: 503 });
  }
  const raw = await request.text();
  if (raw.length > 24000 || !(await verified(request, raw))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = JSON.parse(raw) as { eventId?: unknown; type?: unknown; email?: unknown; deliveredAt?: unknown; items?: unknown };
    if (body.type !== "order.delivered" || typeof body.eventId !== "string" || typeof body.email !== "string" || typeof body.deliveredAt !== "string" || !Array.isArray(body.items)) {
      return Response.json({ error: "Invalid lifecycle event." }, { status: 400 });
    }
    const items = body.items.map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return { category: typeof row.category === "string" ? row.category : "", qty: typeof row.qty === "number" ? row.qty : 0 };
    });
    const result = await enqueueDeliveredLifecycleEvent({ eventId: body.eventId, email: body.email, deliveredAt: body.deliveredAt, items });
    return Response.json(result, { status: 202, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "Invalid lifecycle event." }, { status: 400 });
  }
}
