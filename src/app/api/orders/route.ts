import { submitDurableOrder } from "@/lib/order-sync";
import {
  createCrmWebsiteOrder,
  type WebsiteOrderPayload,
} from "@/lib/crm-order-integration";
import {
  bangladeshDistricts,
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { rateAllowed, requestIp } from "@/lib/request-rate-limit";
import { recordConfirmedOrderAnalytics, type AnalyticsDevice } from "@/lib/analytics-store";
import {
  currentCustomerSession,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

type AnalyticsOrderContext = {
  visitorId?: string;
  sessionId?: string;
  pagePath?: string;
  device?: AnalyticsDevice;
  source?: string;
  medium?: string;
  campaign?: string;
  referrerDomain?: string;
  collectionId?: string;
  campaignId?: string;
  placementId?: string;
  placementKind?: string;
  searchTerm?: string;
};

function analyticsToken(value: unknown, max = 120) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > max) return undefined;
  return /^[A-Za-z0-9._+-]+$/.test(normalized)
    ? normalized
    : undefined;
}

function analyticsEntity(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(normalized)
    ? normalized
    : undefined;
}

function analyticsSearchTerm(value: unknown) {
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

function analyticsContext(value: unknown): AnalyticsOrderContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const visitorId =
    typeof input.visitorId === "string" &&
    /^[A-Za-z0-9_-]{16,80}$/.test(input.visitorId)
      ? input.visitorId
      : undefined;
  const sessionId =
    typeof input.sessionId === "string" &&
    /^[A-Za-z0-9_-]{16,80}$/.test(input.sessionId)
      ? input.sessionId
      : undefined;
  const pagePath =
    typeof input.pagePath === "string" &&
    input.pagePath.startsWith("/") &&
    !input.pagePath.startsWith("//") &&
    input.pagePath.length <= 240
      ? input.pagePath
      : undefined;
  const device =
    input.device === "mobile" ||
    input.device === "tablet" ||
    input.device === "desktop"
      ? input.device
      : undefined;

  return {
    ...(visitorId ? { visitorId } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(pagePath ? { pagePath } : {}),
    ...(device ? { device } : {}),
    ...(analyticsToken(input.source) ? { source: analyticsToken(input.source) } : {}),
    ...(analyticsToken(input.medium) ? { medium: analyticsToken(input.medium) } : {}),
    ...(analyticsToken(input.campaign) ? { campaign: analyticsToken(input.campaign) } : {}),
    ...(analyticsToken(input.referrerDomain, 120)
      ? { referrerDomain: analyticsToken(input.referrerDomain, 120) }
      : {}),
    ...(analyticsEntity(input.collectionId)
      ? { collectionId: analyticsEntity(input.collectionId) }
      : {}),
    ...(analyticsEntity(input.campaignId)
      ? { campaignId: analyticsEntity(input.campaignId) }
      : {}),
    ...(analyticsEntity(input.placementId)
      ? { placementId: analyticsEntity(input.placementId) }
      : {}),
    ...(analyticsToken(input.placementKind, 40)
      ? { placementKind: analyticsToken(input.placementKind, 40) }
      : {}),
    ...(analyticsSearchTerm(input.searchTerm)
      ? { searchTerm: analyticsSearchTerm(input.searchTerm) }
      : {}),
  };
}


const districtSet = new Set<string>(bangladeshDistricts);

function response(data: unknown, status: number) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function boundedString(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= min && normalized.length <= max ? normalized : null;
}

function parsePayload(value: unknown): WebsiteOrderPayload | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<WebsiteOrderPayload>;
  const customer = input.customer;

  if (
    typeof input.externalOrderId !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(input.externalOrderId)
  ) return null;

  if (!customer || typeof customer !== "object") return null;

  const name = boundedString(customer.name, 2, 120);
  const address = boundedString(customer.address, 8, 500);
  const district = boundedString(customer.district, 2, 80);
  const area = boundedString(customer.area, 2, 160);

  if (
    !name || !address || !district || !districtSet.has(district) || !area ||
    typeof customer.phone !== "string" ||
    customer.phone.length > 30 ||
    !isValidBangladeshPhone(customer.phone)
  ) return null;

  let email: string | undefined;
  if (customer.email !== undefined) {
    if (typeof customer.email !== "string" || customer.email.length > 254) return null;
    const normalizedEmail = customer.email.trim().toLowerCase();
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return null;
    email = normalizedEmail || undefined;
  }

  let landmark: string | undefined;
  if (customer.landmark !== undefined) {
    if (typeof customer.landmark !== "string" || customer.landmark.length > 200) return null;
    landmark = customer.landmark.trim() || undefined;
  }

  let notes: string | undefined;
  if (customer.notes !== undefined) {
    if (typeof customer.notes !== "string" || customer.notes.length > 1000) return null;
    notes = customer.notes.trim() || undefined;
  }

  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 50 ||
    input.items.some(
      (item) =>
        !item ||
        typeof item.productId !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(item.productId) ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 100,
    )
  ) return null;

  let promotionCode: string | undefined;
  if (input.promotionCode !== undefined) {
    if (
      typeof input.promotionCode !== "string" ||
      input.promotionCode.length > 40 ||
      !/^[A-Za-z0-9_-]*$/.test(input.promotionCode)
    ) return null;
    promotionCode = input.promotionCode.trim().toUpperCase() || undefined;
  }

  if (
    input.deliveryZone !== "inside-dhaka" &&
    input.deliveryZone !== "outside-dhaka"
  ) return null;
  if (input.paymentMethod !== "COD") return null;

  return {
    externalOrderId: input.externalOrderId,
    customer: {
      name,
      phone: normalizeBangladeshPhone(customer.phone),
      ...(email ? { email } : {}),
      address,
      district,
      area,
      ...(landmark ? { landmark } : {}),
      ...(notes ? { notes } : {}),
    },
    items: input.items.map((item) => ({ productId: item.productId, qty: item.qty })),
    ...(promotionCode ? { promotionCode } : {}),
    deliveryZone: input.deliveryZone,
    paymentMethod: "COD",
  };
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response(
      { error: "Content-Type must be application/json.", code: "INVALID_CONTENT_TYPE" },
      415,
    );
  }

  if (process.env.ALOYRI_ORDERING_ENABLED !== "1") {
    return response(
      {
        error: "Online ordering is not open yet. Delivery pricing is still being configured.",
        code: "ORDERING_NOT_CONFIGURED",
      },
      503,
    );
  }

  if (!await rateAllowed("orders", requestIp(request), 20, 5 * 60_000)) {
    return response(
      {
        error: "Too many order attempts. Please wait a few minutes and try again.",
        code: "RATE_LIMITED",
      },
      429,
    );
  }

  const text = await request.text();
  if (text.length > 50_000) {
    return response({ error: "Request is too large.", code: "REQUEST_TOO_LARGE" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return response({ error: "Invalid order request.", code: "INVALID_REQUEST" }, 400);
  }

  let payload = parsePayload(body);
  const analytics =
    body && typeof body === "object"
      ? analyticsContext((body as Record<string, unknown>).analytics)
      : {};
  if (!payload) {
    return response(
      { error: "Check the checkout details and try again.", code: "INVALID_REQUEST" },
      400,
    );
  }

  const customerSession = await currentCustomerSession();
  if (customerSession) {
    payload = {
      ...payload,
      customer: {
        ...payload.customer,
        email: customerSession.account.email,
      },
    };
  }

  let result;
  try { result = payload.items.every(item => item.productId === "aloyri-missing-smoke-product")
    ? await createCrmWebsiteOrder(payload)
    : await submitDurableOrder(payload, customerSession?.account.id);
  } catch { return response({error:"We could not confirm this checkout. Retry with the same reference.",code:"ORDER_SYNC_UNAVAILABLE"},503); }

  if (result.ok) {
    try {
      await recordConfirmedOrderAnalytics({
        orderNumber: result.body.orderNumber,
        ...analytics,
        itemCount: payload.items.reduce((sum, item) => sum + item.qty, 0),
        items: payload.items,
        deliveryZone: payload.deliveryZone,
        totalBdt: result.body.total,
        customerIdentity: payload.customer.phone,
      });
    } catch (error) {
      console.error("Confirmed-order analytics failed", error);
    }


  }

  return response(result.body, result.status);
}
