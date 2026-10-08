import { rateAllowed } from "@/lib/request-rate-limit";
import { fetchOrderTracking } from "@/lib/order-tracking";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
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

function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}



export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Content-Type must be application/json.", code: "INVALID_CONTENT_TYPE" }, 415);
  }

  if (!await rateAllowed("track-order", requestIp(request), 12, 300000)) {
    return response(
      {
        error: "Too many tracking attempts. Please wait a few minutes and try again.",
        code: "RATE_LIMITED",
      },
      429,
    );
  }

  const text = await request.text();

  if (text.length > 2048) {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  if (!body || typeof body !== "object") {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  const input = body as { orderNumber?: unknown; phone?: unknown };

  if (
    typeof input.orderNumber !== "string" ||
    !/^WEB-[A-Z0-9-]{8,90}$/i.test(input.orderNumber.trim()) ||
    typeof input.phone !== "string" ||
    !isValidBangladeshPhone(input.phone)
  ) {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  const result = await fetchOrderTracking({
    orderNumber: input.orderNumber.trim(),
    phone: normalizeBangladeshPhone(input.phone),
  });

  return response(result.body, result.status);
}
