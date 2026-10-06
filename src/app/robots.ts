import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/cart",
        "/checkout",
        "/order-confirmation",
        "/track-order",
        "/return-request",
      ],
    },
    sitemap: siteConfig.url + "/sitemap.xml",
    host: siteConfig.url,
  };
}
