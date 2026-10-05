export const dynamic = "force-dynamic";

const events = new Set([
  "product_view",
  "add_to_cart",
  "checkout_start",
  "checkout_review",
  "order_created",
  "order_tracking_success",
  "return_request_submitted",
  "web_vital",
]);

const categories = new Set(["Cleanser", "Moisturizer", "Sunscreen"]);
const deliveryZones = new Set(["inside-dhaka", "outside-dhaka"]);
const statuses = new Set([
  "New",
  "Confirmed",
  "Ready to pack",
  "Packed",
  "Shipped",
  "Out for delivery",
  "Delivered",
  "Returned",
  "Cancelled",
]);
const reasons = new Set([
  "Wrong product delivered",
  "Damaged on arrival",
  "Missing item",
  "Product issue",
  "Changed mind",
  "Other",
]);
const resolutions = new Set(["Refund", "Replacement", "Store credit", "Other"]);

type RateEntry = { count: number; resetAt: number };
const globalRate = globalThis as typeof globalThis & {
  __aloyriAnalyticsRate?: Map<string, RateEntry>;
};
const rateStore =
  globalRate.__aloyriAnalyticsRate ??
  (globalRate.__aloyriAnalyticsRate = new Map<string, RateEntry>());

function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateAllowed(key: string) {
  const now = Date.now();
  if (rateStore.size > 3000) {
    for (const [entryKey, entry] of rateStore) {
      if (entry.resetAt <= now) rateStore.delete(entryKey);
    }
  }

  const current = rateStore.get(key);
  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (current.count >= 120) return false;
  current.count += 1;
  return true;
}

function safeProperties(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const output: Record<string, string | number> = {};

  if (
    typeof input.productId === "string" &&
    /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(input.productId)
  ) {
    output.productId = input.productId;
  }
  if (typeof input.category === "string" && categories.has(input.category)) {
    output.category = input.category;
  }
  if (
    typeof input.itemCount === "number" &&
    Number.isInteger(input.itemCount) &&
    input.itemCount >= 1 &&
    input.itemCount <= 99
  ) {
    output.itemCount = input.itemCount;
  }
  if (
    typeof input.deliveryZone === "string" &&
    deliveryZones.has(input.deliveryZone)
  ) {
    output.deliveryZone = input.deliveryZone;
  }
  if (input.paymentMethod === "COD") output.paymentMethod = "COD";
  if (typeof input.orderStatus === "string" && statuses.has(input.orderStatus)) {
    output.orderStatus = input.orderStatus;
  }
  if (typeof input.reason === "string" && reasons.has(input.reason)) {
    output.reason = input.reason;
  }
  if (typeof input.resolution === "string" && resolutions.has(input.resolution)) {
    output.resolution = input.resolution;
  }
  if (
    typeof input.metric === "string" &&
    ["LCP", "CLS", "INP", "TTFB"].includes(input.metric)
  ) {
    output.metric = input.metric;
  }
  if (
    typeof input.metricValue === "number" &&
    Number.isFinite(input.metricValue) &&
    input.metricValue >= 0 &&
    input.metricValue <= 1_000_000
  ) {
    output.metricValue = Math.round(input.metricValue * 1000) / 1000;
  }
  if (
    typeof input.totalBdt === "number" &&
    Number.isFinite(input.totalBdt) &&
    input.totalBdt >= 0 &&
    input.totalBdt <= 10_000_000
  ) {
    output.totalBdt = Math.round(input.totalBdt * 100) / 100;
  }

  return output;
}

export async function POST(request: Request) {
  if (!rateAllowed(requestIp(request))) {
    return new Response(null, { status: 204 });
  }

  const text = await request.text();
  if (text.length > 2048) return new Response(null, { status: 204 });

  try {
    const body = JSON.parse(text) as { event?: unknown; properties?: unknown };
    if (typeof body.event !== "string" || !events.has(body.event)) {
      return new Response(null, { status: 204 });
    }

    const entry = {
      event: body.event,
      properties: safeProperties(body.properties),
      timestamp: new Date().toISOString(),
    };

    // Deliberately excludes request headers, IP, user agent, URL query,
    // customer/order identifiers and arbitrary free-text fields.
    console.info("aloyri_storefront_event", JSON.stringify(entry));
  } catch {
    // Analytics must never affect storefront behavior.
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
