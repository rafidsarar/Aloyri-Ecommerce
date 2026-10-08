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
      phone?: unknown;
      savedProductIds?: unknown;
      wishlistChange?: {productId?:unknown;saved?:unknown};
      emailPreferences?: unknown;
      savedAddresses?: unknown;
    };
    if (body.wishlistChange && (typeof body.wishlistChange.productId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(body.wishlistChange.productId) || typeof body.wishlistChange.saved !== "boolean")) return Response.json({error:"Invalid wishlist change."},{status:400});
    const account = await updateCurrentCustomerAccount({
      ...(body.wishlistChange ? {wishlistChange:body.wishlistChange as {productId:string;saved:boolean}} : {}),
      ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
      ...(typeof body.displayName === "string"
        ? { displayName: body.displayName }
        : {}),
      ...(body.savedProductIds !== undefined
        ? { savedProductIds: body.savedProductIds }
        : {}),
      ...(body.savedAddresses !== undefined
        ? { savedAddresses: body.savedAddresses }
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
    if (error instanceof Error && error.message === "INVALID_PHONE") {
      return Response.json({ error: "Enter a valid Bangladesh mobile number." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_NAME") {
      return Response.json({ error: "Full name must be between 2 and 80 characters." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }
    return Response.json({ error: "Unable to update account." }, { status: 400 });
  }
}
