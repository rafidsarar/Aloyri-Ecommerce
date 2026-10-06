import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

type RedirectRow = StorefrontConfig["seo"]["redirects"][number];

let redirectCache:
  | { expiresAt: number; redirects: RedirectRow[] }
  | undefined;

const protectedPrefixes = [
  "/admin",
  "/api",
  "/_next",
  "/checkout",
  "/cart",
  "/order-confirmation",
  "/track-order",
  "/return-request",
];

function storagePath(pathname: string) {
  return process.env.VERCEL_ENV === "production"
    ? pathname
    : "preview/" + pathname;
}

async function publishedRedirects() {
  if (redirectCache && redirectCache.expiresAt > Date.now()) {
    return redirectCache.redirects;
  }

  try {
    const result = await get(storagePath("admin/storefront-config.json"), {
      access: "private",
      useCache: true,
    });
    if (!result) return [];

    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw) as Partial<StorefrontConfig>;
    const redirects = Array.isArray(parsed.seo?.redirects)
      ? parsed.seo.redirects.filter(
          (row): row is RedirectRow =>
            Boolean(
              row &&
                row.active &&
                typeof row.from === "string" &&
                typeof row.to === "string",
            ),
        )
      : [];

    redirectCache = {
      expiresAt: Date.now() + 30_000,
      redirects,
    };
    return redirects;
  } catch (error) {
    console.error("SEO redirect lookup failed", error);
    return [];
  }
}

export async function proxy(request: NextRequest) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  if (
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
    )
  ) {
    return NextResponse.next();
  }

  const redirects = await publishedRedirects();
  const match = redirects.find((row) => row.from === pathname);
  if (!match) return NextResponse.next();

  const target = new URL(match.to, request.url);
  if (!match.to.includes("?")) {
    target.search = request.nextUrl.search;
  }

  return NextResponse.redirect(target, match.permanent ? 308 : 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
