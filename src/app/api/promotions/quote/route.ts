import { quoteCrmPromotion } from "@/lib/crm-promotion-integration";
import type { PromotionQuoteRequest } from "@/lib/promotions";

export const dynamic = "force-dynamic";

function response(data: unknown, status: number) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validRequest(value: unknown): value is PromotionQuoteRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<PromotionQuoteRequest>;
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
  ) {
    return false;
  }

  if (
    input.deliveryZone !== undefined &&
    input.deliveryZone !== "inside-dhaka" &&
    input.deliveryZone !== "outside-dhaka"
  ) {
    return false;
  }

  if (
    input.code !== undefined &&
    (typeof input.code !== "string" ||
      input.code.length > 40 ||
      !/^[A-Za-z0-9_-]*$/.test(input.code))
  ) {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Content-Type must be application/json.", code: "INVALID_CONTENT_TYPE" }, 415);
  }

  const text = await request.text();
  if (text.length > 32_768) {
    return response({ error: "Request is too large.", code: "REQUEST_TOO_LARGE" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return response({ error: "Invalid promotion request.", code: "INVALID_REQUEST" }, 400);
  }

  if (!validRequest(body)) {
    return response(
      { error: "Check the promotion details and try again.", code: "INVALID_REQUEST" },
      400,
    );
  }

  const result = await quoteCrmPromotion({
    items: body.items,
    ...(body.deliveryZone ? { deliveryZone: body.deliveryZone } : {}),
    code: (body.code || "").trim().toUpperCase(),
  });

  return response(result.body, result.status);
}
