import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
