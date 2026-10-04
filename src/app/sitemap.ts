import type { MetadataRoute } from "next";
import { products } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/shop",
    "/category/cleansers",
    "/category/moisturizers",
    "/category/sunscreen",
    "/about",
    "/customer-care",
    "/shipping-delivery",
    "/returns-refunds",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: absoluteUrl(path || "/"),
      lastModified: now,
      changeFrequency: path === "" || path === "/shop" ? "daily" as const : "monthly" as const,
      priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.6,
    })),
    ...products.map((product) => ({
      url: absoluteUrl("/product/" + product.slug),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
