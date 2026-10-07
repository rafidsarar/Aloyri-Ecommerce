import { paymentProviderReadiness } from "@/lib/payment-provider-readiness";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return Response.json(
      {
        error: "Content-Type must be application/json.",
        code: "INVALID_CONTENT_TYPE",
      },
      { status: 415 },
    );
  }
  const raw = await request.text();
  if (raw.length > 2048) {
    return Response.json(
      { error: "Invalid payment request.", code: "INVALID_PAYMENT_REQUEST" },
      { status: 400 },
    );
  }
  try {
    const body = JSON.parse(raw) as { paymentMethod?: unknown };
    if (body.paymentMethod !== "bKash" && body.paymentMethod !== "Nagad") {
      return Response.json(
        { error: "Choose bKash or Nagad.", code: "INVALID_PAYMENT_METHOD" },
        { status: 400 },
      );
    }
    const provider = paymentProviderReadiness().providers[body.paymentMethod];
    return Response.json(
      {
        enabled: false,
        configured: provider.configured,
        paymentMethod: body.paymentMethod,
        error: provider.reason,
        code: "PAYMENT_PROVIDER_DORMANT",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Invalid payment request.", code: "INVALID_PAYMENT_REQUEST" },
      { status: 400 },
    );
  }
}
