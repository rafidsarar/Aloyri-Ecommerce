import { rateAllowed } from "@/lib/request-rate-limit";
import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { reconcileSettlementFromTracking } from "@/lib/payment-settlement";
import {
  publicShipmentTracking,
  reconcileShipmentFromTracking,
} from "@/lib/courier-shipment";

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

  const result = await fetchCrmOrderTracking({
    orderNumber: input.orderNumber.trim(),
    phone: normalizeBangladeshPhone(input.phone),
  });

  if (result.ok) {
    try {
      await reconcileSettlementFromTracking({
        orderNumber: result.body.orderNumber,
        paymentMethod: result.body.paymentMethod,
        total: result.body.total,
        orderStatus: result.body.status,
      });
    } catch (error) {
      console.error("Payment reconciliation failed", error);
    }

    let shipment = null;
    try {
      shipment = await reconcileShipmentFromTracking({
        orderNumber: result.body.orderNumber,
        orderTotal: result.body.total,
        paymentMethod: result.body.paymentMethod,
        orderStatus: result.body.status,
        trackingReference: result.body.trackingReference,
      });
    } catch (error) {
      console.error("Shipment reconciliation failed", error);
    }

    return response(
      {
        ...result.body,
        shipment: publicShipmentTracking(shipment),
      },
      result.status,
    );
  }

  return response(result.body, result.status);
}
