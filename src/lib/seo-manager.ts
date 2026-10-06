import type { Metadata } from "next";
import type { LiveCatalogProduct } from "@/lib/catalog";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  defaultSeoConfig,
  type SeoConfig,
  SeoEntry,
  SeoPageKey,
  SeoRedirect,
  StorefrontConfig,
} from "@/lib/storefront-admin-store";

const protectedIndexPaths = new Set([
  "/cart",
  "/checkout",
  "/order-confirmation",
  "/track-order",
  "/return-request",
]);

const protectedRedirectPrefixes = [
  "/admin",
  "/api",
  "/_next",
  "/checkout",
  "/cart",
  "/order-confirmation",
  "/track-order",
  "/return-request",
  "/robots.txt",
  "/sitemap.xml",
];

export type SeoHealthIssue = {
  id: string;
  severity: "error" | "warning";
  label: string;
  href: string;
  message: string;
};

export type SeoHealthReport = {
  score: number;
  errors: number;
  warnings: number;
  issues: SeoHealthIssue[];
};

export function safeInternalPath(value: string | undefined, fallback: string) {
  const trimmed = (value || "").trim();
  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    /^\/\\/i.test(trimmed) ||
    /[\r\n]/.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed.slice(0, 400);
}

export function seoImageUrl(pathname?: string) {
  if (!pathname) return undefined;
  const logical = pathname.startsWith("media/") ? pathname.slice(6) : pathname;
  if (!/^[A-Za-z0-9._/-]+$/.test(logical) || logical.includes("..")) {
    return undefined;
  }
  return absoluteUrl("/api/storefront-media/" + logical);
}

export function effectiveSeoEntry(
  entry: SeoEntry | undefined,
  fallback: Required<Pick<SeoEntry, "title" | "description" | "canonical">> &
    Partial<SeoEntry>,
): SeoEntry {
  return {
    ...fallback,
    ...(entry || {}),
    title: entry?.title?.trim() || fallback.title,
    description: entry?.description?.trim() || fallback.description,
    canonical: safeInternalPath(entry?.canonical, fallback.canonical),
    index: entry?.index ?? fallback.index ?? true,
    follow: entry?.follow ?? fallback.follow ?? true,
    ogTitle: entry?.ogTitle?.trim() || entry?.title?.trim() || fallback.ogTitle || fallback.title,
    ogDescription:
      entry?.ogDescription?.trim() ||
      entry?.description?.trim() ||
      fallback.ogDescription ||
      fallback.description,
    ogImagePath: entry?.ogImagePath || fallback.ogImagePath,
  };
}

export function buildSeoMetadata(
  entry: SeoEntry,
  fallback: Required<Pick<SeoEntry, "title" | "description" | "canonical">> &
    Partial<SeoEntry>,
  options?: {
    imageFallback?: string;
    forceNoIndex?: boolean;
  },
): Metadata {
  const effective = effectiveSeoEntry(entry, fallback);
  const canonical = safeInternalPath(effective.canonical, fallback.canonical);
  const forcedNoIndex =
    options?.forceNoIndex || protectedIndexPaths.has(canonical);
  const image = seoImageUrl(effective.ogImagePath) || options?.imageFallback;
  const index = forcedNoIndex ? false : effective.index !== false;
  const follow = forcedNoIndex ? false : effective.follow !== false;

  return {
    title: canonical === "/" ? { absolute: effective.title || siteConfig.name } : effective.title,
    description: effective.description,
    alternates: { canonical },
    robots: { index, follow },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      url: canonical,
      title: effective.ogTitle || effective.title,
      description: effective.ogDescription || effective.description,
      images: image
        ? [{ url: image, alt: effective.ogTitle || effective.title || siteConfig.name }]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: effective.ogTitle || effective.title,
      description: effective.ogDescription || effective.description,
      images: image ? [image] : undefined,
    },
  };
}

export const publicPagePaths: Record<SeoPageKey, string> = {
  about: "/about",
  faq: "/faq",
  shipping: "/shipping-delivery",
  returns: "/returns-refunds",
  contact: "/contact",
  customerCare: "/customer-care",
  privacy: "/privacy",
  terms: "/terms",
};

export const publicPageLabels: Record<SeoPageKey, string> = {
  about: "About",
  faq: "FAQ",
  shipping: "Shipping & delivery",
  returns: "Returns & refunds",
  contact: "Contact",
  customerCare: "Customer care",
  privacy: "Privacy policy",
  terms: "Terms & conditions",
};

export function staticPageSeoMetadata(
  config: StorefrontConfig,
  key: SeoPageKey,
): Metadata {
  const fallback = defaultSeoConfig.pages[key];
  return buildSeoMetadata(config.seo.pages[key], {
    title: fallback.title || publicPageLabels[key],
    description:
      fallback.description || "Aloyri skincare information for Bangladesh.",
    canonical: fallback.canonical || publicPagePaths[key],
    index: fallback.index,
    follow: fallback.follow,
    ogTitle: fallback.ogTitle,
    ogDescription: fallback.ogDescription,
    ogImagePath: fallback.ogImagePath,
  });
}

export function shopSeoMetadata(config: StorefrontConfig): Metadata {
  const fallback = defaultSeoConfig.shop;
  return buildSeoMetadata(config.seo.shop, {
    title: fallback.title || "Shop skincare",
    description:
      fallback.description || "Shop Aloyri skincare in Bangladesh.",
    canonical: "/shop",
    index: fallback.index,
    follow: fallback.follow,
    ogTitle: fallback.ogTitle,
    ogDescription: fallback.ogDescription,
    ogImagePath: fallback.ogImagePath,
  });
}

export function categorySeoMetadata(
  config: StorefrontConfig,
  key: keyof StorefrontConfig["seo"]["categories"],
): Metadata {
  const fallback = defaultSeoConfig.categories[key];
  return buildSeoMetadata(config.seo.categories[key], {
    title: fallback.title || key,
    description:
      fallback.description || "Shop Aloyri skincare in Bangladesh.",
    canonical: fallback.canonical || "/category/" + key,
    index: fallback.index,
    follow: fallback.follow,
    ogTitle: fallback.ogTitle,
    ogDescription: fallback.ogDescription,
    ogImagePath: fallback.ogImagePath,
  });
}

export function productSeoFallback(product: {
  id: string;
  name: string;
  brand: string;
  slug?: string;
  description?: string;
}) {
  return {
    title: [product.brand, product.name].filter(Boolean).join(" "),
    description:
      product.description?.trim() ||
      `${product.name} by ${product.brand || "Aloyri"} with live BDT pricing and availability in Bangladesh.`,
    canonical: "/product/" + (product.slug || product.id),
    index: true,
    follow: true,
  } satisfies SeoEntry & {
    title: string;
    description: string;
    canonical: string;
  };
}

function validateEntry(
  issues: SeoHealthIssue[],
  key: string,
  label: string,
  href: string,
  effective: SeoEntry,
  knownPaths: Set<string>,
) {
  const title = effective.title?.trim() || "";
  const description = effective.description?.trim() || "";
  const canonical = effective.canonical || "";

  if (!title) {
    issues.push({
      id: key + "-title-missing",
      severity: "error",
      label,
      href,
      message: "SEO title is missing.",
    });
  } else if (title.length > 60) {
    issues.push({
      id: key + "-title-long",
      severity: "warning",
      label,
      href,
      message: `SEO title is ${title.length} characters; aim for 60 or fewer.`,
    });
  } else if (title.length < 15) {
    issues.push({
      id: key + "-title-short",
      severity: "warning",
      label,
      href,
      message: `SEO title is only ${title.length} characters.`,
    });
  }

  if (!description) {
    issues.push({
      id: key + "-description-missing",
      severity: "error",
      label,
      href,
      message: "Meta description is missing.",
    });
  } else if (description.length > 160) {
    issues.push({
      id: key + "-description-long",
      severity: "warning",
      label,
      href,
      message: `Meta description is ${description.length} characters; aim for 160 or fewer.`,
    });
  } else if (description.length < 70) {
    issues.push({
      id: key + "-description-short",
      severity: "warning",
      label,
      href,
      message: `Meta description is only ${description.length} characters.`,
    });
  }

  const normalized = safeInternalPath(canonical, "");
  if (!normalized || normalized !== canonical) {
    issues.push({
      id: key + "-canonical-invalid",
      severity: "error",
      label,
      href,
      message: "Canonical URL must be a safe internal path beginning with /.",
    });
  } else if (
    effective.index !== false &&
    !knownPaths.has(normalized) &&
    !normalized.startsWith("/product/")
  ) {
    issues.push({
      id: key + "-canonical-unknown",
      severity: "warning",
      label,
      href,
      message: "Canonical URL does not match a known public storefront route.",
    });
  }

  if (!effective.ogImagePath && !key.startsWith("product:")) {
    issues.push({
      id: key + "-og-image-missing",
      severity: "warning",
      label,
      href,
      message: "No dedicated social sharing image is configured.",
    });
  }
}

export function redirectValidationError(
  redirect: Pick<SeoRedirect, "from" | "to">,
) {
  const from = safeInternalPath(redirect.from, "");
  const to = safeInternalPath(redirect.to, "");

  if (!from || from !== redirect.from.trim()) {
    return "Source must be a safe internal path beginning with /.";
  }
  if (!to || to !== redirect.to.trim()) {
    return "Destination must be a safe internal path beginning with /.";
  }
  if (from === to) return "Source and destination cannot be the same.";
  if (protectedRedirectPrefixes.some((prefix) => from === prefix || from.startsWith(prefix + "/"))) {
    return "Protected ecommerce/admin routes cannot be redirect sources.";
  }
  return "";
}

export function analyzeSeoHealth(
  config: StorefrontConfig,
  products: LiveCatalogProduct[],
): SeoHealthReport {
  const issues: SeoHealthIssue[] = [];
  const knownPaths = new Set([
    "/",
    "/shop",
    "/category/cleansers",
    "/category/moisturizers",
    "/category/sunscreen",
    ...Object.values(publicPagePaths),
    ...products.map((product) => "/product/" + (product.slug || product.id)),
  ]);

  const entries: Array<{
    key: string;
    label: string;
    href: string;
    effective: SeoEntry;
  }> = [
    {
      key: "homepage",
      label: "Homepage",
      href: "/admin/seo/pages/homepage",
      effective: effectiveSeoEntry(config.seo.homepage, {
        title: "Aloyri — Let Your Skin Glow.",
        description: siteConfig.description,
        canonical: "/",
      }),
    },
    {
      key: "shop",
      label: "Shop",
      href: "/admin/seo/pages/shop",
      effective: effectiveSeoEntry(config.seo.shop, {
        title: "Shop skincare",
        description: "Shop Aloyri skincare with live BDT pricing and availability.",
        canonical: "/shop",
      }),
    },
    ...Object.entries(config.seo.categories).map(([key, entry]) => ({
      key: "category:" + key,
      label: "Category · " + key,
      href: "/admin/seo/pages/category-" + key,
      effective: effectiveSeoEntry(entry, {
        title: key,
        description: "Shop Aloyri skincare in Bangladesh.",
        canonical: "/category/" + key,
      }),
    })),
    ...Object.entries(config.seo.pages).map(([key, entry]) => {
      const pageKey = key as SeoPageKey;
      return {
        key: "page:" + key,
        label: publicPageLabels[pageKey],
        href: "/admin/seo/pages/" + key,
        effective: effectiveSeoEntry(entry, {
          title: publicPageLabels[pageKey],
          description: "Aloyri skincare information for Bangladesh.",
          canonical: publicPagePaths[pageKey],
        }),
      };
    }),
    ...products.map((product) => ({
      key: "product:" + product.id,
      label: "Product · " + product.name,
      href: "/admin/seo/products/" + encodeURIComponent(product.id),
      effective: effectiveSeoEntry(
        config.seo.products[product.id],
        productSeoFallback(product),
      ),
    })),
  ];

  for (const entry of entries) {
    validateEntry(
      issues,
      entry.key,
      entry.label,
      entry.href,
      entry.effective,
      knownPaths,
    );
  }

  const titleOwners = new Map<string, string[]>();
  const descriptionOwners = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.effective.index === false) continue;
    const title = entry.effective.title?.trim().toLowerCase();
    const description = entry.effective.description?.trim().toLowerCase();
    if (title) titleOwners.set(title, [...(titleOwners.get(title) || []), entry.label]);
    if (description) {
      descriptionOwners.set(description, [
        ...(descriptionOwners.get(description) || []),
        entry.label,
      ]);
    }
  }

  for (const [title, labels] of titleOwners) {
    if (labels.length > 1) {
      issues.push({
        id: "duplicate-title-" + title.slice(0, 30),
        severity: "warning",
        label: labels.join(", "),
        href: "/admin/seo",
        message: "Duplicate SEO title is used by multiple indexable pages.",
      });
    }
  }
  for (const [description, labels] of descriptionOwners) {
    if (labels.length > 1) {
      issues.push({
        id: "duplicate-description-" + description.slice(0, 30),
        severity: "warning",
        label: labels.join(", "),
        href: "/admin/seo",
        message: "Duplicate meta description is used by multiple pages.",
      });
    }
  }

  const redirectSources = new Map<string, number>();
  for (const redirect of config.seo.redirects) {
    if (!redirect.active) continue;
    const validation = redirectValidationError(redirect);
    if (validation) {
      issues.push({
        id: "redirect-" + redirect.id,
        severity: "error",
        label: "Redirect " + redirect.from,
        href: "/admin/seo/redirects",
        message: validation,
      });
    }
    redirectSources.set(redirect.from, (redirectSources.get(redirect.from) || 0) + 1);
    const reverse = config.seo.redirects.find(
      (candidate) =>
        candidate.active &&
        candidate.from === redirect.to &&
        candidate.to === redirect.from,
    );
    if (reverse) {
      issues.push({
        id: "redirect-loop-" + redirect.id,
        severity: "error",
        label: "Redirect " + redirect.from,
        href: "/admin/seo/redirects",
        message: "Redirect loop detected.",
      });
    }
  }
  for (const [source, count] of redirectSources) {
    if (count > 1) {
      issues.push({
        id: "redirect-duplicate-" + source,
        severity: "error",
        label: "Redirect " + source,
        href: "/admin/seo/redirects",
        message: "Multiple active redirects use the same source path.",
      });
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const score = Math.max(0, Math.min(100, 100 - errors * 10 - warnings * 2));

  return {
    score,
    errors,
    warnings,
    issues: issues.slice(0, 120),
  };
}

export function seoConfigPathEntry(
  seo: SeoConfig,
  key: string,
): SeoEntry | undefined {
  if (key === "homepage") return seo.homepage;
  if (key === "shop") return seo.shop;
  if (key.startsWith("category-")) {
    const category = key.slice("category-".length) as keyof SeoConfig["categories"];
    return seo.categories[category];
  }
  return seo.pages[key as SeoPageKey];
}
