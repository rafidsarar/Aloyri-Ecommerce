import { courierProviderReadiness } from "@/lib/courier-provider-readiness";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return Response.json(
      { error: "Content-Type must be application/json.", code: "INVALID_CONTENT_TYPE" },
      { status: 415 },
    );
  }

  const raw = await request.text();
  if (raw.length > 2048) {
    return Response.json(
      { error: "Invalid courier request.", code: "INVALID_COURIER_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const body = JSON.parse(raw) as { provider?: unknown };
    if (
      body.provider !== "pathao" &&
      body.provider !== "steadfast" &&
      body.provider !== "redx"
    ) {
      return Response.json(
        { error: "Choose a supported courier provider.", code: "INVALID_COURIER_PROVIDER" },
        { status: 400 },
      );
    }
    const provider = courierProviderReadiness().providers[body.provider];
    return Response.json(
      {
        provider: body.provider,
        enabled: false,
        credentialsConfigured: provider.credentialsConfigured,
        error: provider.reason,
        code: "COURIER_PROVIDER_DORMANT",
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
      { error: "Invalid courier request.", code: "INVALID_COURIER_REQUEST" },
      { status: 400 },
    );
  }
}
