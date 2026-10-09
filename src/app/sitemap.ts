import type { MetadataRoute } from "next";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { mergeLiveCatalog, products as localProducts } from "@/lib/catalog";
import { buildCategoryDirectory, matchesCategory } from "@/lib/storefront-categories";
import { applyMerchandisingRules } from "@/lib/merchandising";
import {
  effectiveSeoEntry,
  productSeoFallback,
  publicPagePaths,
  safeInternalPath,
} from "@/lib/seo-manager";
import { absoluteUrl } from "@/lib/site";
import {
  applyStorefrontEditorial,
  readPublishedStorefrontConfig,
  type SeoPageKey,
} from "@/lib/storefront-admin-store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await readPublishedStorefrontConfig();
  const lastModified = Number.isNaN(Date.parse(config.updatedAt))
    ? undefined
    : new Date(config.updatedAt);

  let crmCategories: string[] = [];
  let catalog = localProducts.map((product) => ({
    ...product,
    ...(config.products[product.id] || {}),
  }));

  try {
    const live = await fetchCrmCatalog();
    if (live.ok) {
      crmCategories = live.body.categories;
      catalog = mergeLiveCatalog(
        applyMerchandisingRules(
          applyStorefrontEditorial(live.body.products, config),
          config,
        ),
      );
    }
  } catch {
    // Keep the website-owned fallback catalog if CRM is temporarily unavailable.
  }

  const staticEntries: Array<{
    path: string;
    entry: typeof config.seo.homepage;
    frequency: "daily" | "weekly" | "monthly";
    priority: number;
  }> = [
    { path: "/", entry: config.seo.homepage, frequency: "daily", priority: 1 },
    { path: "/shop", entry: config.seo.shop, frequency: "daily", priority: 0.9 },
    ...buildCategoryDirectory(crmCategories, catalog)
      .filter(item => catalog.some(product => matchesCategory(product.category, item.name)))
      .map(item => ({
        path: item.href,
        entry: item.slug === "cleansers" ? config.seo.categories.cleansers :
          item.slug === "moisturizers" ? config.seo.categories.moisturizers :
          item.slug === "sunscreen" ? config.seo.categories.sunscreen : {},
        frequency: "weekly" as const,
        priority: 0.75,
      })),
    ...(
      Object.entries(publicPagePaths) as Array<[SeoPageKey, string]>
    ).map(([key, path]) => ({
      path,
      entry: config.seo.pages[key],
      frequency: "monthly" as const,
      priority: key === "about" || key === "faq" ? 0.65 : 0.55,
    })),
  ];

  const staticRoutes = staticEntries
    .filter(({ entry }) => entry.index !== false)
    .map(({ path, entry, frequency, priority }) => ({
      url: absoluteUrl(safeInternalPath(entry.canonical, path)),
      lastModified,
      changeFrequency: frequency,
      priority,
    }));

  const productRoutes = catalog
    .map((product) => ({
      product,
      seo: effectiveSeoEntry(
        config.seo.products[product.id],
        productSeoFallback(product),
      ),
    }))
    .filter(({ seo }) => seo.index !== false)
    .map(({ seo }) => ({
      url: absoluteUrl(seo.canonical || "/"),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const collectionRoutes = config.merchandising.collections
    .filter(
      (collection) =>
        collection.active && collection.seo.index !== false,
    )
    .map((collection) => ({
      url: absoluteUrl(
        safeInternalPath(
          collection.seo.canonical,
          "/collections/" + collection.slug,
        ),
      ),
      lastModified: Number.isNaN(Date.parse(collection.updatedAt))
        ? lastModified
        : new Date(collection.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  const seen = new Set<string>();
  return [...staticRoutes, ...collectionRoutes, ...productRoutes].filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
