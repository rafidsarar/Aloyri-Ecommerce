import { fetchCrmPromotionQuote } from "@/lib/crm-promotions-integration";
import type { WebsitePromotionQuotePayload } from "@/lib/crm-promotions-integration";

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

function validPayload(value: unknown): value is WebsitePromotionQuotePayload {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<WebsitePromotionQuotePayload>;

  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 50 ||
    input.items.some(
      (item) =>
        !item ||
        typeof item.productId !== "string" ||
        item.productId.length < 1 ||
        item.productId.length > 100 ||
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

  return (
    input.code === undefined ||
    (typeof input.code === "string" &&
      input.code.length <= 40 &&
      /^[A-Za-z0-9_-]*$/.test(input.code))
  );
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 20_000) {
    return response({ error: "Request is too large.", code: "REQUEST_TOO_LARGE" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return response({ error: "Invalid promotion request.", code: "INVALID_REQUEST" }, 400);
  }

  if (!validPayload(body)) {
    return response(
      { error: "Check the promotion details and try again.", code: "INVALID_REQUEST" },
      400,
    );
  }

  const result = await fetchCrmPromotionQuote(body);
  return response(result.body, result.status);
}
