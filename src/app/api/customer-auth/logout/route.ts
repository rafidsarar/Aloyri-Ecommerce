import { NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  revokeCurrentCustomerSession,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await revokeCurrentCustomerSession();
  const response = NextResponse.json(
    { signedOut: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
