import {
  createCrmWebsiteOrder,
  type WebsiteOrderPayload,
} from "@/lib/crm-order-integration";

export const dynamic = "force-dynamic";

function response(data: unknown, status: number) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function validPayload(value: unknown): value is WebsiteOrderPayload {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<WebsiteOrderPayload>;

  if (
    typeof input.externalOrderId !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(input.externalOrderId)
  ) {
    return false;
  }

  if (
    !input.customer ||
    typeof input.customer.name !== "string" ||
    typeof input.customer.phone !== "string" ||
    typeof input.customer.address !== "string" ||
    typeof input.customer.district !== "string" ||
    typeof input.customer.area !== "string" ||
    (input.customer.email !== undefined &&
      (typeof input.customer.email !== "string" ||
        (input.customer.email.trim().length > 0 &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer.email.trim()))))
  ) {
    return false;
  }

  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 50 ||
    input.items.some(
      (item) =>
        !item ||
        typeof item.productId !== "string" ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 100,
    )
  ) {
    return false;
  }

  if (
    input.promotionCode !== undefined &&
    (typeof input.promotionCode !== "string" ||
      input.promotionCode.length > 40 ||
      !/^[A-Za-z0-9_-]*$/.test(input.promotionCode))
  ) {
    return false;
  }

  return (
    (input.deliveryZone === "inside-dhaka" ||
      input.deliveryZone === "outside-dhaka") &&
    input.paymentMethod === "COD"
  );
}

export async function POST(request: Request) {
  if (process.env.ALOYRI_ORDERING_ENABLED !== "1") {
    return response(
      {
        error:
          "Online ordering is not open yet. Delivery pricing is still being configured.",
        code: "ORDERING_NOT_CONFIGURED",
      },
      503,
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

  if (!validPayload(body)) {
    return response(
      { error: "Check the checkout details and try again.", code: "INVALID_REQUEST" },
      400,
    );
  }

  const result = await createCrmWebsiteOrder(body);

  return response(result.body, result.status);
}
