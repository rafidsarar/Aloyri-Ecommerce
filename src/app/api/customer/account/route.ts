import {
  currentCustomerSession,
  updateCurrentCustomerAccount,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestUrl = new URL(request.url);
  return origin === requestUrl.origin;
}

export async function GET() {
  const session = await currentCustomerSession();
  if (!session) {
    return Response.json(
      { error: "Sign in required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { account: session.account },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return Response.json({ error: "Invalid request." }, { status: 415 });
  }
  const raw = await request.text();
  if (raw.length > 16_000) {
    return Response.json({ error: "Request too large." }, { status: 413 });
  }
  try {
    const body = JSON.parse(raw) as {
      displayName?: unknown;
      savedProductIds?: unknown;
      emailPreferences?: unknown;
    };
    const account = await updateCurrentCustomerAccount({
      ...(typeof body.displayName === "string"
        ? { displayName: body.displayName }
        : {}),
      ...(body.savedProductIds !== undefined
        ? { savedProductIds: body.savedProductIds }
        : {}),
      ...(body.emailPreferences && typeof body.emailPreferences === "object"
        ? { emailPreferences: body.emailPreferences as {
            postDelivery?: boolean;
            reviewRequest?: boolean;
            reorderReminder?: boolean;
          } }
        : {}),
    });
    return Response.json(
      { account },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }
    return Response.json({ error: "Unable to update account." }, { status: 400 });
  }
}
