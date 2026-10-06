import { createCartRecovery, cartRecoveryReadiness } from "@/lib/cart-recovery";
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
  const readiness = cartRecoveryReadiness();
  if (!readiness.enabled) {
    return response(
      {
        enabled: false,
        code: "RECOVERY_NOT_READY",
        error: "Cart recovery email is not active yet.",
      },
      503,
    );
  }
  if (!rateAllowed("cart-recovery", requestIp(request), 12, 60 * 60_000)) {
    return response({ error: "Too many recovery requests." }, 429);
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
  if (raw.length > 12_000) return response({ error: "Request too large." }, 413);

  try {
    const body = JSON.parse(raw) as {
      consent?: unknown;
      email?: unknown;
      totalBdt?: unknown;
      items?: unknown;
    };
    if (body.consent !== true) {
      return response({ error: "Recovery consent is required." }, 400);
    }
    if (
      typeof body.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
      return response({ error: "Add a valid email address." }, 400);
    }
    if (!Array.isArray(body.items)) {
      return response({ error: "Cart items are required." }, 400);
    }
    const items = body.items.map((item) => {
      const row =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      return {
        productId:
          typeof row.productId === "string" ? row.productId : "",
        qty: typeof row.qty === "number" ? row.qty : 0,
      };
    });
    const record = await createCartRecovery({
      email: body.email,
      items,
      totalBdt:
        typeof body.totalBdt === "number" ? body.totalBdt : 0,
    });
    return response(
      {
        enabled: true,
        saved: true,
        scheduledAt: record.scheduledAt,
        expiresAt: record.expiresAt,
      },
      201,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save recovery.";
    return response(
      {
        error:
          message === "RECOVERY_NOT_READY"
            ? "Cart recovery email is not active yet."
            : "Unable to save cart recovery.",
      },
      message === "RECOVERY_NOT_READY" ? 503 : 400,
    );
  }
}
