import { NextResponse } from "next/server";
import {
  GOOGLE_NEXT_COOKIE,
  GOOGLE_PKCE_COOKIE,
  googleAuthReady,
  googleAuthorizeUrl,
  googlePkceChallenge,
  googlePkceVerifier,
  safeCustomerNextPath,
} from "@/lib/supabase-google-auth";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!googleAuthReady()) {
    return NextResponse.json(
      { error: "Google sign-in is not configured yet." },
      { status: 503 },
    );
  }

  const verifier = googlePkceVerifier();
  const challenge = await googlePkceChallenge(verifier);
  const next = safeCustomerNextPath(
    new URL(request.url).searchParams.get("next"),
  );
  const redirectTo =
    siteConfig.url.replace(/\/$/, "") +
    "/api/customer-auth/google/callback";

  const response = NextResponse.redirect(
    googleAuthorizeUrl({ redirectTo, challenge }),
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set(GOOGLE_PKCE_COOKIE, verifier, cookieOptions);
  response.cookies.set(GOOGLE_NEXT_COOKIE, next, cookieOptions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
