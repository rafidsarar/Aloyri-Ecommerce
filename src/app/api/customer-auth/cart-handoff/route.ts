import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentCustomerSession } from "@/lib/customer-auth";
import {
  CART_HANDOFF_COOKIE,
  CART_HANDOFF_MAX_AGE_SECONDS,
  cleanHandoffItems,
  loadHandoff,
  storeHandoff,
} from "@/lib/customer-cart-handoff";
import { rateAllowed, requestIp } from "@/lib/request-rate-limit";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Invalid request origin." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }
  if (!await rateAllowed("customer-cart-handoff", requestIp(request), 20, 30 * 60_000)) {
    return json({ error: "Too many attempts. Try again shortly." }, 429);
  }
  const raw = await request.text();
  if (raw.length > 7_000) return json({ error: "Request too large." }, 413);
  let items;
  try {
    const parsed = JSON.parse(raw) as { items?: unknown };
    items = cleanHandoffItems(parsed?.items);
  } catch {
    return json({ error: "Invalid cart." }, 400);
  }
  if (!items) return json({ error: "Invalid cart items." }, 400);

  try {
    const token = await storeHandoff(items);
    const response = json({ saved: true }, 201);
    response.cookies.set(CART_HANDOFF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CART_HANDOFF_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return json({ error: "Unable to prepare your cart for sign-in. Please try again." }, 503);
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CART_HANDOFF_COOKIE)?.value;
  if (!token) return json({ restored: false, items: [] });
  const session = await currentCustomerSession();
  if (!session || session.session.method !== "google") {
    return json({ error: "Sign in required to restore your cart." }, 401);
  }
  try {
    const items = await loadHandoff(token);
    const response = json(items ? { restored: true, items } : { restored: false, items: [] });
    // The opaque handoff cookie is removed after it has been read.
    response.cookies.set(CART_HANDOFF_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    // Preserve the short-lived token for a later retry if the datastore is down.
    return json({ error: "Unable to restore the cart yet." }, 503);
  }
}
