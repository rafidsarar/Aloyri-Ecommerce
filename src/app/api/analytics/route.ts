import {
  hashAnalyticsIdentifier,
  recordAnalyticsEvent,
  type AnalyticsDevice,
  type AnalyticsEventName,
} from "@/lib/analytics-store";
import { recordRuntimeError } from "@/lib/runtime-error-store";

export const dynamic = "force-dynamic";

const events = new Set<AnalyticsEventName>([
  "page_view",
  "product_view",
  "product_click",
  "collection_view",
  "collection_product_click",
  "campaign_impression",
  "campaign_click",
  "merchandising_impression",
  "merchandising_click",
  "search",
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
const devices = new Set<AnalyticsDevice>(["mobile", "tablet", "desktop"]);

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

  if (current.count >= 180) return false;
  current.count += 1;
  return true;
}

function safeToken(value: unknown, max = 80) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > max ||
    !/^[A-Za-z0-9._+-]+$/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function safeEntityId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(normalized)
    ? normalized
    : undefined;
}

function safePath(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > 240 ||
    /[\r\n]/.test(value) ||
    value.startsWith("/admin") ||
    value.startsWith("/api")
  ) {
    return undefined;
  }
  return value;
}

function safeSearchTerm(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 50);
  if (
    normalized.length < 2 ||
    normalized.includes("@") ||
    /\d{6,}/.test(normalized) ||
    !/^[A-Za-z0-9 .&'+_-]+$/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function safeProperties(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const output: Record<string, string | number> = {};

  const productId = safeEntityId(input.productId);
  if (productId) output.productId = productId;

  const collectionId = safeEntityId(input.collectionId);
  if (collectionId) output.collectionId = collectionId;

  const campaignId = safeEntityId(input.campaignId);
  if (campaignId) output.campaignId = campaignId;

  const placementId = safeEntityId(input.placementId);
  if (placementId) output.placementId = placementId;

  const placementKind = safeToken(input.placementKind, 40);
  if (placementKind) output.placementKind = placementKind;

  const searchTerm = safeSearchTerm(input.searchTerm);
  if (searchTerm) output.searchTerm = searchTerm;

  if (
    typeof input.resultCount === "number" &&
    Number.isInteger(input.resultCount) &&
    input.resultCount >= 0 &&
    input.resultCount <= 5000
  ) {
    output.resultCount = input.resultCount;
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

async function safeContext(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const visitorId =
    typeof input.visitorId === "string" ? input.visitorId : undefined;
  const sessionId =
    typeof input.sessionId === "string" ? input.sessionId : undefined;
  const [visitorHash, sessionHash] = await Promise.all([
    hashAnalyticsIdentifier(visitorId),
    hashAnalyticsIdentifier(sessionId),
  ]);

  const source = safeToken(input.source);
  const medium = safeToken(input.medium);
  const campaign = safeToken(input.campaign);
  const referrerDomain = safeToken(input.referrerDomain, 120);
  const collectionId = safeEntityId(input.collectionId);
  const campaignId = safeEntityId(input.campaignId);
  const placementId = safeEntityId(input.placementId);
  const placementKind = safeToken(input.placementKind, 40);
  const searchTerm = safeSearchTerm(input.searchTerm);
  const device =
    typeof input.device === "string" &&
    devices.has(input.device as AnalyticsDevice)
      ? (input.device as AnalyticsDevice)
      : undefined;

  return {
    ...(visitorHash ? { visitorHash } : {}),
    ...(sessionHash ? { sessionHash } : {}),
    ...(safePath(input.pagePath)
      ? { pagePath: safePath(input.pagePath) }
      : {}),
    ...(device ? { device } : {}),
    ...(source ? { source } : {}),
    ...(medium ? { medium } : {}),
    ...(campaign ? { campaign } : {}),
    ...(referrerDomain ? { referrerDomain } : {}),
    ...(collectionId ? { collectionId } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(placementId ? { placementId } : {}),
    ...(placementKind ? { placementKind } : {}),
    ...(searchTerm ? { searchTerm } : {}),
  };
}

export async function POST(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return new Response(null, { status: 204 });
  }

  if (!rateAllowed(requestIp(request))) {
    return new Response(null, { status: 204 });
  }

  const text = await request.text();
  if (text.length > 4096) return new Response(null, { status: 204 });

  try {
    const body = JSON.parse(text) as {
      event?: unknown;
      properties?: unknown;
      context?: unknown;
    };
    if (
      typeof body.event !== "string" ||
      !events.has(body.event as AnalyticsEventName) ||
      body.event === "order_created"
    ) {
      return new Response(null, { status: 204 });
    }

    const properties = safeProperties(body.properties);
    const context = await safeContext(body.context);

    await recordAnalyticsEvent({
      event: body.event as AnalyticsEventName,
      ...context,
      ...properties,
    });
  } catch (error) {
    await recordRuntimeError("analytics.ingestion", error);
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
