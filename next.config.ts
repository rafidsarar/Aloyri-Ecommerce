import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' ws: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// The Builder embeds public storefront pages from this same origin.
// Keep the default anti-framing headers on every other route, especially Admin,
// account and checkout pages. Last matching header rule wins for "/".
const publicPreviewHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy.replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/", "/about", "/shipping-delivery", "/returns-refunds", "/contact", "/faq", "/shop"].map(source => ({ source, headers: publicPreviewHeaders })),
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "www.simpleskincare.in", pathname: "/cdn/shop/**" },
      { protocol: "https", hostname: "skincafe.co", pathname: "/storage/media/**" },
      { protocol: "https", hostname: "mrmax.jp", pathname: "/static_files/product_images/**" },
      { protocol: "https", hostname: "www.arogga.com", pathname: "/_next/image" },
    ],
  },
};

export default nextConfig;
