import { NextResponse } from "next/server";
import {
  consumeCustomerMagicLink,
  CUSTOMER_SESSION_COOKIE,
} from "@/lib/customer-auth";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  try {
    const result = await consumeCustomerMagicLink(token);
    const url = new URL(result.nextPath, siteConfig.url);
    url.searchParams.set("signedIn", "1");
    const response = NextResponse.redirect(url);
    response.cookies.set(CUSTOMER_SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/account?signin=invalid", siteConfig.url),
    );
  }
}
