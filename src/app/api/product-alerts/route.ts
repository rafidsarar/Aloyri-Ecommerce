import { createProductAlert } from "@/lib/product-alerts";
import { rateAllowed, requestIp } from "@/lib/request-rate-limit";

export const dynamic = "force-dynamic";

function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  if (!await rateAllowed("product-alerts", requestIp(request), 12, 60 * 60_000)) {
    return response({ error: "Too many alert requests. Try again later." }, 429);
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return response({ error: "Invalid request." }, 415);
  }
  const raw = await request.text();
  if (raw.length > 8192) return response({ error: "Request too large." }, 413);

  try {
    const body = JSON.parse(raw) as {
      productId?: unknown;
      kinds?: unknown;
    };
    if (
      typeof body.productId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(body.productId)
    ) {
      return response({ error: "Invalid product." }, 400);
    }

    const record = await createProductAlert({
      productId: body.productId,
      kinds: body.kinds,
    });
    return response(
      {
        saved: true,
        kinds: record.kinds,
        message: "Your product alert is active.",
      },
      201,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const messages: Record<string, [string, number]> = {
      ALERTS_NOT_READY: [
        "Product email alerts are not active until Aloyri's sending domain is verified.",
        503,
      ],
      CATALOG_UNAVAILABLE: [
        "Live product information is temporarily unavailable.",
        503,
      ],
      PRODUCT_NOT_FOUND: ["This product is not available for alerts.", 404],
      SIGN_IN_REQUIRED: ["Sign in securely before creating a product alert.", 401],
      INVALID_EMAIL: ["Your account email is unavailable.", 400],
      NO_ALERT_KIND: ["Choose an available alert type.", 400],
    };
    const [message, status] = messages[code] || [
      "Unable to create this product alert.",
      400,
    ];
    return response({ error: message, code }, status);
  }
}
