import type { LiveCatalogProduct, Product } from "@/lib/catalog";
import { hasSalePrice } from "@/lib/promotions";
import type {
  HomepageMerchandisingSection,
  MerchandisingCampaign,
  MerchandisingCollection,
  MerchandisingConfig,
  OutOfStockMode,
  StorefrontConfig,
} from "@/lib/storefront-admin-store";

export type MerchandisingHealthIssue = {
  id: string;
  severity: "error" | "warning";
  label: string;
  href: string;
  message: string;
};

export type MerchandisingHealthReport = {
  score: number;
  errors: number;
  warnings: number;
  issues: MerchandisingHealthIssue[];
};

function boundedPriority(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1000, Math.min(1000, Math.trunc(value || 0)));
}

function normalizeBadge(value: string | undefined) {
  const badge = (value || "").trim().slice(0, 24);
  return badge || undefined;
}

export function effectiveOutOfStockMode(
  configured: "inherit" | OutOfStockMode | undefined,
  globalMode: OutOfStockMode,
): OutOfStockMode {
  return configured && configured !== "inherit" ? configured : globalMode;
}

export function applyMerchandisingRules(
  products: LiveCatalogProduct[],
  config: StorefrontConfig,
): LiveCatalogProduct[] {
  return products.map((product) => {
    const rule = config.merchandising.productRules[product.id];
    return {
      ...product,
      merchandisingBadge: normalizeBadge(rule?.badge),
      merchandisingPriority: boundedPriority(rule?.priority),
      merchandisingSearchBoost: Math.max(
        -100,
        Math.min(100, Math.trunc(rule?.searchBoost || 0)),
      ),
      merchandisingHideFromSearch: Boolean(rule?.hideFromSearch),
      merchandisingOutOfStockMode: effectiveOutOfStockMode(
        rule?.outOfStockMode,
        config.merchandising.outOfStockMode,
      ),
    };
  });
}

function orderedByPriority(products: Product[]) {
  return [...products].sort((a, b) => {
    const priority =
      (b.merchandisingPriority || 0) - (a.merchandisingPriority || 0);
    if (priority !== 0) return priority;
    return a.name.localeCompare(b.name);
  });
}

function outOfStockAdjusted(
  products: Product[],
  mode: OutOfStockMode,
): Product[] {
  if (mode === "hide") {
    return products.filter((product) => (product.availableStock ?? 0) > 0);
  }
  if (mode === "push-down") {
    return [...products].sort(
      (a, b) =>
        Number((a.availableStock ?? 0) <= 0) -
        Number((b.availableStock ?? 0) <= 0),
    );
  }
  return products;
}

function outOfStockAdjustedWithProductRules(
  products: Product[],
  globalMode: OutOfStockMode,
): Product[] {
  const visible = products.filter((product) => {
    const mode = product.merchandisingOutOfStockMode || globalMode;
    return !(
      mode === "hide" &&
      (product.availableStock ?? 0) <= 0
    );
  });

  return [...visible].sort((a, b) => {
    const aMode = a.merchandisingOutOfStockMode || globalMode;
    const bMode = b.merchandisingOutOfStockMode || globalMode;
    const aPush =
      aMode === "push-down" && (a.availableStock ?? 0) <= 0;
    const bPush =
      bMode === "push-down" && (b.availableStock ?? 0) <= 0;
    return Number(aPush) - Number(bPush);
  });
}

export function selectCollectionProducts(
  collection: MerchandisingCollection,
  products: Product[],
  globalMode: OutOfStockMode,
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const ordered = collection.productIds
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));
  return outOfStockAdjusted(
    ordered,
    effectiveOutOfStockMode(collection.outOfStockMode, globalMode),
  );
}

function campaignWindowState(campaign: MerchandisingCampaign, now: Date) {
  const nowMs = now.getTime();
  const startMs = campaign.startAt ? Date.parse(campaign.startAt) : undefined;
  const endMs = campaign.endAt ? Date.parse(campaign.endAt) : undefined;

  if (campaign.startAt && Number.isNaN(startMs)) return "invalid";
  if (campaign.endAt && Number.isNaN(endMs)) return "invalid";
  if (startMs !== undefined && endMs !== undefined && startMs > endMs) {
    return "invalid";
  }
  if (startMs !== undefined && nowMs < startMs) return "scheduled";
  if (endMs !== undefined && nowMs > endMs) return "ended";
  return "live";
}

export function campaignScheduleState(
  campaign: MerchandisingCampaign,
  now = new Date(),
) {
  if (!campaign.active) return "disabled" as const;
  return campaignWindowState(campaign, now);
}

export function isCampaignActive(
  campaign: MerchandisingCampaign,
  now = new Date(),
) {
  return campaign.active && campaignWindowState(campaign, now) === "live";
}

export function selectCampaignProducts(
  campaign: MerchandisingCampaign,
  products: Product[],
  config: MerchandisingConfig,
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  let ids = campaign.productIds;

  if (campaign.collectionId) {
    const collection = config.collections.find(
      (candidate) =>
        candidate.id === campaign.collectionId && candidate.active,
    );
    if (collection) {
      ids = [...collection.productIds, ...ids.filter((id) => !collection.productIds.includes(id))];
    }
  }

  let selected = ids
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));

  if (campaign.promotionOnly) {
    selected = selected.filter((product) => hasSalePrice(product));
  }

  return campaign.outOfStockMode &&
    campaign.outOfStockMode !== "inherit"
    ? outOfStockAdjusted(selected, campaign.outOfStockMode)
    : outOfStockAdjustedWithProductRules(
        selected,
        config.outOfStockMode,
      );
}

export function productsForHomepageSection(
  section: HomepageMerchandisingSection,
  config: MerchandisingConfig,
  products: Product[],
  now = new Date(),
): Product[] {
  const max = Math.max(1, Math.min(12, section.maxProducts || 6));
  let selected: Product[] = [];

  if (section.kind === "bestsellers") {
    selected = products.filter((product) => product.bestseller);
    if (!selected.length) selected = products;
  } else if (section.kind === "featured") {
    selected = products.filter((product) => product.featured);
    if (!selected.length) selected = products;
  } else if (section.kind === "new-arrivals") {
    selected = products.filter(
      (product) =>
        (product.merchandisingBadge || "").toLowerCase() === "new",
    );
  } else if (section.kind === "collection" && section.referenceId) {
    const collection = config.collections.find(
      (candidate) =>
        candidate.id === section.referenceId && candidate.active,
    );
    if (collection) {
      selected = selectCollectionProducts(
        collection,
        products,
        config.outOfStockMode,
      );
      return selected.slice(0, max);
    }
  } else if (section.kind === "campaign" && section.referenceId) {
    const campaign = config.campaigns.find(
      (candidate) =>
        candidate.id === section.referenceId &&
        isCampaignActive(candidate, now),
    );
    if (campaign) {
      selected = selectCampaignProducts(campaign, products, config);
    }
  }

  selected = orderedByPriority(selected);
  selected = outOfStockAdjustedWithProductRules(
    selected,
    config.outOfStockMode,
  );
  return selected.slice(0, max);
}

export function activeCampaigns(
  config: MerchandisingConfig,
  now = new Date(),
) {
  return config.campaigns.filter((campaign) => isCampaignActive(campaign, now));
}

export function collectionHref(collection: MerchandisingCollection) {
  return "/collections/" + collection.slug;
}

export function analyzeMerchandisingHealth(
  config: StorefrontConfig,
  products: LiveCatalogProduct[],
  now = new Date(),
): MerchandisingHealthReport {
  const issues: MerchandisingHealthIssue[] = [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const collectionMap = new Map(
    config.merchandising.collections.map((collection) => [
      collection.id,
      collection,
    ]),
  );

  const slugOwners = new Map<string, string[]>();
  for (const collection of config.merchandising.collections) {
    const slug = collection.slug.trim().toLowerCase();
    if (!slug) {
      issues.push({
        id: "collection-slug-" + collection.id,
        severity: "error",
        label: collection.title || "Untitled collection",
        href: "/admin/merchandising/collections/" + collection.id,
        message: "Collection slug is missing.",
      });
    } else {
      slugOwners.set(slug, [...(slugOwners.get(slug) || []), collection.id]);
    }

    if (collection.active && collection.productIds.length === 0) {
      issues.push({
        id: "collection-empty-" + collection.id,
        severity: "warning",
        label: collection.title,
        href: "/admin/merchandising/collections/" + collection.id,
        message: "Active collection has no products.",
      });
    }

    for (const productId of collection.productIds) {
      const product = productMap.get(productId);
      if (!product) {
        issues.push({
          id: "collection-missing-" + collection.id + "-" + productId,
          severity: "error",
          label: collection.title,
          href: "/admin/merchandising/collections/" + collection.id,
          message: "Collection references a product that is missing from the CRM catalog: " + productId,
        });
      } else if (!product.active) {
        issues.push({
          id: "collection-inactive-" + collection.id + "-" + productId,
          severity: "warning",
          label: collection.title,
          href: "/admin/merchandising/collections/" + collection.id,
          message: product.name + " is inactive in CRM.",
        });
      } else if (product.availableStock <= 0) {
        issues.push({
          id: "collection-oos-" + collection.id + "-" + productId,
          severity: "warning",
          label: collection.title,
          href: "/admin/merchandising/collections/" + collection.id,
          message: product.name + " is out of stock.",
        });
      }
    }

    if (collection.active) {
      if (!collection.seo.title?.trim()) {
        issues.push({
          id: "collection-seo-title-" + collection.id,
          severity: "warning",
          label: collection.title,
          href: "/admin/merchandising/collections/" + collection.id,
          message: "Collection SEO title is missing.",
        });
      }
      if (!collection.seo.description?.trim()) {
        issues.push({
          id: "collection-seo-description-" + collection.id,
          severity: "warning",
          label: collection.title,
          href: "/admin/merchandising/collections/" + collection.id,
          message: "Collection meta description is missing.",
        });
      }
    }
  }

  for (const [slug, owners] of slugOwners) {
    if (owners.length > 1) {
      for (const owner of owners) {
        const collection = collectionMap.get(owner);
        issues.push({
          id: "collection-duplicate-slug-" + owner,
          severity: "error",
          label: collection?.title || slug,
          href: "/admin/merchandising/collections/" + owner,
          message: "Collection slug is duplicated: " + slug,
        });
      }
    }
  }

  for (const campaign of config.merchandising.campaigns) {
    const state = campaignScheduleState(campaign, now);
    if (state === "invalid") {
      issues.push({
        id: "campaign-window-" + campaign.id,
        severity: "error",
        label: campaign.title || "Untitled campaign",
        href: "/admin/merchandising/campaigns/" + campaign.id,
        message: "Campaign schedule is invalid or starts after it ends.",
      });
    }

    if (
      campaign.collectionId &&
      !collectionMap.has(campaign.collectionId)
    ) {
      issues.push({
        id: "campaign-collection-" + campaign.id,
        severity: "error",
        label: campaign.title,
        href: "/admin/merchandising/campaigns/" + campaign.id,
        message: "Campaign references a collection that no longer exists.",
      });
    }

    const targetIds = new Set(campaign.productIds);
    const collection = campaign.collectionId
      ? collectionMap.get(campaign.collectionId)
      : undefined;
    for (const id of collection?.productIds || []) targetIds.add(id);

    if (campaign.active && targetIds.size === 0) {
      issues.push({
        id: "campaign-empty-" + campaign.id,
        severity: "warning",
        label: campaign.title,
        href: "/admin/merchandising/campaigns/" + campaign.id,
        message: "Active campaign has no collection or products selected.",
      });
    }

    let promotedCount = 0;
    for (const productId of targetIds) {
      const product = productMap.get(productId);
      if (!product) {
        issues.push({
          id: "campaign-missing-" + campaign.id + "-" + productId,
          severity: "error",
          label: campaign.title,
          href: "/admin/merchandising/campaigns/" + campaign.id,
          message: "Campaign references a missing CRM product: " + productId,
        });
      } else {
        if (!product.active) {
          issues.push({
            id: "campaign-inactive-" + campaign.id + "-" + productId,
            severity: "warning",
            label: campaign.title,
            href: "/admin/merchandising/campaigns/" + campaign.id,
            message: product.name + " is inactive in CRM.",
          });
        }
        if (product.availableStock <= 0) {
          issues.push({
            id: "campaign-oos-" + campaign.id + "-" + productId,
            severity: "warning",
            label: campaign.title,
            href: "/admin/merchandising/campaigns/" + campaign.id,
            message: product.name + " is out of stock.",
          });
        }
        if (
          Number.isFinite(product.salePrice) &&
          Number(product.salePrice) > 0 &&
          Number(product.salePrice) < Number(product.price)
        ) {
          promotedCount += 1;
        }
      }
    }

    if (campaign.promotionOnly && campaign.active && promotedCount === 0) {
      issues.push({
        id: "campaign-no-promotion-" + campaign.id,
        severity: "warning",
        label: campaign.title,
        href: "/admin/merchandising/campaigns/" + campaign.id,
        message:
          "Promotion-only campaign currently has no CRM products with an active sale price.",
      });
    }
  }

  for (const section of config.merchandising.homepageSections) {
    if (!section.enabled) continue;
    if (section.kind === "collection") {
      const collection = section.referenceId
        ? collectionMap.get(section.referenceId)
        : undefined;
      if (!collection || !collection.active) {
        issues.push({
          id: "homepage-collection-" + section.id,
          severity: "error",
          label: section.title || "Homepage collection section",
          href: "/admin/merchandising/homepage",
          message: "Homepage section references a missing or inactive collection.",
        });
      }
    }
    if (section.kind === "campaign") {
      const campaign = config.merchandising.campaigns.find(
        (candidate) => candidate.id === section.referenceId,
      );
      if (!campaign) {
        issues.push({
          id: "homepage-campaign-" + section.id,
          severity: "error",
          label: section.title || "Homepage campaign section",
          href: "/admin/merchandising/homepage",
          message: "Homepage section references a missing campaign.",
        });
      }
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const score = Math.max(0, Math.min(100, 100 - errors * 10 - warnings * 2));

  return {
    score,
    errors,
    warnings,
    issues: issues.slice(0, 150),
  };
}
