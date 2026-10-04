import type { MetadataRoute } from "next";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { mergeLiveCatalog, products } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  let catalog = products;
  try {
    const live = await fetchCrmCatalog();
    if (live.ok && live.body.products.length > 0) {
      catalog = mergeLiveCatalog(live.body.products);
    }
  } catch {
    // Keep the local merchandising catalog as a safe sitemap fallback.
  }

  return [
    ...staticRoutes.map((path) => ({
      url: absoluteUrl(path || "/"),
      lastModified: now,
      changeFrequency:
        path === "" || path === "/shop" ? ("daily" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.6,
    })),
    ...catalog.map((product) => ({
      url: absoluteUrl("/product/" + product.slug),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
