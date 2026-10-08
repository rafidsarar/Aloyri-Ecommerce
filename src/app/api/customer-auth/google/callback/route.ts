import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionFromGoogleIdentity,
} from "@/lib/customer-auth";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_PKCE_COOKIE,
  exchangeGoogleAuthCode,
  googleAuthReady,
  safeCustomerNextPath,
} from "@/lib/supabase-google-auth";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

function finish(url: URL, response?: NextResponse) {
  const value = response || NextResponse.redirect(url);
  value.cookies.set(GOOGLE_PKCE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  value.cookies.set(GOOGLE_NEXT_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  value.headers.set("Cache-Control", "no-store");
  return value;
}

export async function GET(request: Request) {
  const base = siteConfig.url.replace(/\/$/, "");
  const accountUrl = new URL("/account", base);
  if (!googleAuthReady()) {
    accountUrl.searchParams.set("auth", "google-not-ready");
    return finish(accountUrl);
  }

  const requestUrl = new URL(request.url);
  const providerError = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code") || "";
  const cookieStore = await cookies();
  const verifier = cookieStore.get(GOOGLE_PKCE_COOKIE)?.value || "";
  const next = safeCustomerNextPath(
    cookieStore.get(GOOGLE_NEXT_COOKIE)?.value,
  );

  if (providerError || !code || !verifier) {
    accountUrl.searchParams.set("auth", "google-cancelled");
    return finish(accountUrl);
  }

  try {
    const identity = await exchangeGoogleAuthCode(code, verifier);
    const session = await createCustomerSessionFromGoogleIdentity(identity);
    const complete = session.account.displayName.trim().length >= 2 && /^(?:\+?88)?01[3-9]\d{8}$/.test(session.account.phone || "");
    const destination = complete
      ? new URL(next, base)
      : new URL("/account/setup?next=" + encodeURIComponent(next), base);
    const response = NextResponse.redirect(destination);
    response.cookies.set(CUSTOMER_SESSION_COOKIE, session.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return finish(destination, response);
  } catch (error) {
    console.error(
      "Google customer sign-in failed",
      error instanceof Error ? error.message : "unknown error",
    );
    accountUrl.searchParams.set("auth", "google-failed");
    return finish(accountUrl);
  }
}
