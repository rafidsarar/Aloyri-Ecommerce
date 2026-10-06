import { requestCustomerMagicLink } from "@/lib/customer-auth";
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
  if (!rateAllowed("customer-auth", requestIp(request), 6, 60 * 60_000)) {
    return response(
      { error: "Too many sign-in attempts. Try again later." },
      429,
    );
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
  if (raw.length > 4096) return response({ error: "Invalid request." }, 400);
  try {
    const body = JSON.parse(raw) as {
      email?: unknown;
      nextPath?: unknown;
    };
    if (typeof body.email !== "string" || body.email.length > 254) {
      return response({ error: "Enter a valid email address." }, 400);
    }

    await requestCustomerMagicLink(
      body.email,
      typeof body.nextPath === "string" ? body.nextPath : "/account",
    );
    return response({
      sent: true,
      message: "Check your email for a secure one-time sign-in link.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "AUTH_NOT_READY") {
      return response(
        {
          error:
            "Secure customer sign-in is not active until Aloyri's sending domain is verified.",
          code,
        },
        503,
      );
    }
    if (code === "INVALID_EMAIL") {
      return response({ error: "Enter a valid email address." }, 400);
    }
    return response(
      { error: "Secure sign-in email could not be sent." },
      503,
    );
  }
}
