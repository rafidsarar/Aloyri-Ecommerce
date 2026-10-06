"use server";

import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { safeInternalPath } from "@/lib/seo-manager";
import {
  updateDraftStorefrontConfig,
  uploadStorefrontMedia,
  type HomepageMerchandisingSection,
  type HomepageMerchandisingSectionKind,
  type MerchandisingCampaign,
  type MerchandisingCollection,
  type OutOfStockMode,
  type ProductMerchandisingRule,
  type SeoEntry,
} from "@/lib/storefront-admin-store";

function text(formData: FormData, key: string, max = 4000) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numberValue(
  formData: FormData,
  key: string,
  fallback = 0,
  min = -1000,
  max = 1000,
) {
  const value = Number(text(formData, key, 32));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function ensureAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function safeId(value?: string) {
  const cleaned = (value || "").trim();
  if (/^[A-Za-z0-9_-]{1,64}$/.test(cleaned)) return cleaned;
  return crypto.randomUUID().replace(/-/g, "");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function dhakaIso(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return value + ":00+06:00";
  }
  if (!Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  throw new Error("Campaign date/time is invalid.");
}

function catalogProductOrder(formData: FormData) {
  const ids = text(formData, "catalogIds", 20000)
    .split("\n")
    .map((item) => item.trim())
    .filter((id) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(id));

  return ids
    .filter((id) => checked(formData, "product_" + id + "_selected"))
    .map((id, index) => ({
      id,
      order: numberValue(
        formData,
        "product_" + id + "_order",
        index + 1,
        0,
        10000,
      ),
      index,
    }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((row) => row.id)
    .slice(0, 100);
}

function seoFromForm(
  formData: FormData,
  fallbackCanonical: string,
  current?: SeoEntry,
  imagePath?: string | null,
): SeoEntry {
  const resolvedImage =
    imagePath === null ? undefined : imagePath || current?.ogImagePath;
  return {
    title: text(formData, "seoTitle", 120),
    description: text(formData, "seoDescription", 320),
    canonical: safeInternalPath(
      text(formData, "seoCanonical", 400),
      fallbackCanonical,
    ),
    index: checked(formData, "seoIndex"),
    follow: checked(formData, "seoFollow"),
    ogTitle: text(formData, "seoOgTitle", 120),
    ogDescription: text(formData, "seoOgDescription", 320),
    ...(resolvedImage ? { ogImagePath: resolvedImage } : {}),
  };
}

const outOfStockValues = new Set([
  "inherit",
  "keep",
  "push-down",
  "hide",
]);

const badgeValues = new Set([
  "",
  "New",
  "Bestseller",
  "Limited",
  "Staff Pick",
  "Trending",
]);

const sectionKinds = new Set<HomepageMerchandisingSectionKind>([
  "bestsellers",
  "featured",
  "new-arrivals",
  "collection",
  "campaign",
]);

export async function saveCollection(formData: FormData) {
  await ensureAdmin();
  const id = safeId(text(formData, "id", 64));
  const title = text(formData, "title", 120);
  const slug = safeSlug(text(formData, "slug", 100) || title);
  if (!title || !slug) {
    redirect(
      "/admin/merchandising/collections/" +
        encodeURIComponent(text(formData, "id", 64) || "new") +
        "?error=" +
        encodeURIComponent("Collection title and slug are required."),
    );
  }

  const products = catalogProductOrder(formData);
  const modeRaw = text(formData, "outOfStockMode", 32);
  const outOfStockMode = outOfStockValues.has(modeRaw)
    ? (modeRaw as MerchandisingCollection["outOfStockMode"])
    : "inherit";

  try {
    let imagePath = text(formData, "currentImagePath", 300) || undefined;
    if (checked(formData, "removeImage")) imagePath = undefined;
    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      imagePath = await uploadStorefrontMedia(file);
    }

    let ogImagePath: string | null | undefined =
      text(formData, "currentOgImagePath", 300) || undefined;
    if (checked(formData, "removeOgImage")) ogImagePath = null;
    const ogFile = formData.get("ogImage");
    if (ogFile instanceof File && ogFile.size > 0) {
      ogImagePath = await uploadStorefrontMedia(ogFile);
    }

    await updateDraftStorefrontConfig((config) => {
      const existing = config.merchandising.collections.find(
        (collection) => collection.id === id,
      );
      const duplicate = config.merchandising.collections.find(
        (collection) =>
          collection.id !== id &&
          collection.slug.toLowerCase() === slug.toLowerCase(),
      );
      if (duplicate) throw new Error("Another collection already uses this slug.");

      const now = new Date().toISOString();
      const collection: MerchandisingCollection = {
        id,
        slug,
        title,
        eyebrow: text(formData, "eyebrow", 120),
        description: text(formData, "description", 1200),
        active: checked(formData, "active"),
        productIds: products,
        outOfStockMode,
        ...(imagePath ? { imagePath } : {}),
        seo: seoFromForm(
          formData,
          "/collections/" + slug,
          existing?.seo,
          ogImagePath,
        ),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      config.merchandising.collections = [
        ...config.merchandising.collections.filter(
          (candidate) => candidate.id !== id,
        ),
        collection,
      ];
      return config;
    });
  } catch (error) {
    redirect(
      "/admin/merchandising/collections/" +
        encodeURIComponent(text(formData, "id", 64) || "new") +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect(
    "/admin/merchandising/collections/" +
      encodeURIComponent(id) +
      "?saved=1",
  );
}

export async function deleteCollection(formData: FormData) {
  await ensureAdmin();
  const id = text(formData, "id", 64);

  try {
    await updateDraftStorefrontConfig((config) => {
      const referencedByCampaign = config.merchandising.campaigns.some(
        (campaign) => campaign.collectionId === id,
      );
      const referencedOnHomepage =
        config.merchandising.homepageSections.some(
          (section) =>
            section.kind === "collection" && section.referenceId === id,
        );
      if (referencedByCampaign || referencedOnHomepage) {
        throw new Error(
          "Remove this collection from campaigns and homepage sections before deleting it.",
        );
      }

      config.merchandising.collections =
        config.merchandising.collections.filter(
          (collection) => collection.id !== id,
        );
      return config;
    });
  } catch (error) {
    redirect(
      "/admin/merchandising/collections/" +
        encodeURIComponent(id) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/merchandising/collections?deleted=1");
}

export async function saveCampaign(formData: FormData) {
  await ensureAdmin();
  const id = safeId(text(formData, "id", 64));
  const title = text(formData, "title", 140);
  if (!title) {
    redirect(
      "/admin/merchandising/campaigns/" +
        encodeURIComponent(text(formData, "id", 64) || "new") +
        "?error=" +
        encodeURIComponent("Campaign title is required."),
    );
  }

  try {
    const startAt = dhakaIso(text(formData, "startAt", 80));
    const endAt = dhakaIso(text(formData, "endAt", 80));
    if (startAt && endAt && Date.parse(startAt) > Date.parse(endAt)) {
      throw new Error("Campaign end time must be after its start time.");
    }

    const promotionOnly = checked(formData, "promotionOnly");
    const badgeText = text(formData, "badgeText", 32);
    if (
      badgeText &&
      /(?:sale|discount|%\s*off|৳|\btk\b)/i.test(badgeText) &&
      !promotionOnly
    ) {
      throw new Error(
        "Sale/discount wording requires Promotion-only mode so CRM pricing remains authoritative.",
      );
    }

    let imagePath = text(formData, "currentImagePath", 300) || undefined;
    if (checked(formData, "removeImage")) imagePath = undefined;
    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      imagePath = await uploadStorefrontMedia(file);
    }

    const selectedProducts = catalogProductOrder(formData);
    const collectionId = text(formData, "collectionId", 64) || undefined;
    const campaignOosRaw = text(formData, "outOfStockMode", 32);
    const campaignOutOfStockMode = outOfStockValues.has(campaignOosRaw)
      ? (campaignOosRaw as MerchandisingCampaign["outOfStockMode"])
      : "inherit";

    await updateDraftStorefrontConfig((config) => {
      if (
        collectionId &&
        !config.merchandising.collections.some(
          (collection) => collection.id === collectionId,
        )
      ) {
        throw new Error("Selected collection no longer exists.");
      }

      const existing = config.merchandising.campaigns.find(
        (campaign) => campaign.id === id,
      );
      const now = new Date().toISOString();
      const campaign: MerchandisingCampaign = {
        id,
        title,
        eyebrow: text(formData, "eyebrow", 120),
        copy: text(formData, "copy", 1600),
        active: checked(formData, "active"),
        startAt,
        endAt,
        ctaLabel: text(formData, "ctaLabel", 80),
        ctaHref: safeInternalPath(
          text(formData, "ctaHref", 400),
          collectionId
            ? "/collections/" +
                (config.merchandising.collections.find(
                  (collection) => collection.id === collectionId,
                )?.slug || "")
            : "/shop",
        ),
        ...(imagePath ? { imagePath } : {}),
        ...(collectionId ? { collectionId } : {}),
        productIds: selectedProducts,
        outOfStockMode: campaignOutOfStockMode,
        ...(badgeText ? { badgeText } : {}),
        showProducts: checked(formData, "showProducts"),
        promotionOnly,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      config.merchandising.campaigns = [
        ...config.merchandising.campaigns.filter(
          (candidate) => candidate.id !== id,
        ),
        campaign,
      ];
      return config;
    });
  } catch (error) {
    redirect(
      "/admin/merchandising/campaigns/" +
        encodeURIComponent(text(formData, "id", 64) || "new") +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect(
    "/admin/merchandising/campaigns/" +
      encodeURIComponent(id) +
      "?saved=1",
  );
}

export async function deleteCampaign(formData: FormData) {
  await ensureAdmin();
  const id = text(formData, "id", 64);

  try {
    await updateDraftStorefrontConfig((config) => {
      if (
        config.merchandising.homepageSections.some(
          (section) =>
            section.kind === "campaign" && section.referenceId === id,
        )
      ) {
        throw new Error(
          "Remove this campaign from homepage sections before deleting it.",
        );
      }
      config.merchandising.campaigns =
        config.merchandising.campaigns.filter(
          (campaign) => campaign.id !== id,
        );
      return config;
    });
  } catch (error) {
    redirect(
      "/admin/merchandising/campaigns/" +
        encodeURIComponent(id) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/merchandising/campaigns?deleted=1");
}

export async function saveProductMerchandising(formData: FormData) {
  await ensureAdmin();
  const ids = text(formData, "catalogIds", 20000)
    .split("\n")
    .map((item) => item.trim())
    .filter((id) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(id));

  await updateDraftStorefrontConfig((config) => {
    const rules: Record<string, ProductMerchandisingRule> = {
      ...config.merchandising.productRules,
    };

    for (const id of ids) {
      const badgeRaw = text(formData, "badge_" + id, 32);
      const badge = badgeValues.has(badgeRaw) ? badgeRaw : "";
      const priority = numberValue(
        formData,
        "priority_" + id,
        0,
        -1000,
        1000,
      );
      const modeRaw = text(formData, "outOfStock_" + id, 32);
      const outOfStockMode = outOfStockValues.has(modeRaw)
        ? (modeRaw as ProductMerchandisingRule["outOfStockMode"])
        : "inherit";

      if (!badge && priority === 0 && outOfStockMode === "inherit") {
        delete rules[id];
      } else {
        rules[id] = {
          ...(badge ? { badge } : {}),
          ...(priority !== 0 ? { priority } : {}),
          ...(outOfStockMode !== "inherit" ? { outOfStockMode } : {}),
        };
      }
    }

    config.merchandising.productRules = rules;
    return config;
  });

  redirect("/admin/merchandising/products?saved=1");
}

export async function saveHomepageMerchandising(formData: FormData) {
  await ensureAdmin();
  const sectionCount = Math.min(
    20,
    Math.max(0, numberValue(formData, "sectionCount", 0, 0, 20)),
  );
  const sectionRows: Array<{
    section: HomepageMerchandisingSection;
    position: number;
    index: number;
  }> = [];

  for (let index = 0; index < sectionCount; index += 1) {
    if (checked(formData, "section_" + index + "_remove")) continue;
    const kindRaw = text(formData, "section_" + index + "_kind", 40);
    if (!sectionKinds.has(kindRaw as HomepageMerchandisingSectionKind)) {
      continue;
    }
    const kind = kindRaw as HomepageMerchandisingSectionKind;
    const referenceId =
      text(formData, "section_" + index + "_referenceId", 64) || undefined;
    const existingId = text(formData, "section_" + index + "_id", 64);
    const enabled = checked(formData, "section_" + index + "_enabled");
    const eyebrow = text(formData, "section_" + index + "_eyebrow", 120);
    const title = text(formData, "section_" + index + "_title", 180);
    const copy = text(formData, "section_" + index + "_copy", 700);
    if (
      !existingId &&
      !enabled &&
      !eyebrow &&
      !title &&
      !copy &&
      !referenceId
    ) {
      continue;
    }

    sectionRows.push({
      section: {
        id: safeId(existingId),
        kind,
        enabled,
        eyebrow,
        title,
        copy,
        ...(referenceId ? { referenceId } : {}),
        maxProducts: numberValue(
          formData,
          "section_" + index + "_maxProducts",
          6,
          1,
          12,
        ),
      },
      position: numberValue(
        formData,
        "section_" + index + "_position",
        index + 1,
        0,
        1000,
      ),
      index,
    });
  }

  const sections = sectionRows
    .sort((a, b) => a.position - b.position || a.index - b.index)
    .map((row) => row.section);

  const globalModeRaw = text(formData, "outOfStockMode", 32);
  const globalMode =
    globalModeRaw === "keep" ||
    globalModeRaw === "hide" ||
    globalModeRaw === "push-down"
      ? (globalModeRaw as OutOfStockMode)
      : "push-down";
  const shopSortMode =
    text(formData, "shopSortMode", 32) === "featured"
      ? "featured"
      : "priority";

  try {
    await updateDraftStorefrontConfig((config) => {
      const heroProductId = text(formData, "heroProductId", 120);
      if (heroProductId) config.homepage.heroProductId = heroProductId;

      for (const section of sections) {
        if (
          section.kind === "collection" &&
          (!section.referenceId ||
            !config.merchandising.collections.some(
              (collection) => collection.id === section.referenceId,
            ))
        ) {
          throw new Error(
            "A collection homepage section references a missing collection.",
          );
        }
        if (
          section.kind === "campaign" &&
          (!section.referenceId ||
            !config.merchandising.campaigns.some(
              (campaign) => campaign.id === section.referenceId,
            ))
        ) {
          throw new Error(
            "A campaign homepage section references a missing campaign.",
          );
        }
      }

      config.merchandising.outOfStockMode = globalMode;
      config.merchandising.shopSortMode = shopSortMode;
      config.merchandising.homepageSections = sections;
      return config;
    });
  } catch (error) {
    redirect(
      "/admin/merchandising/homepage?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/merchandising/homepage?saved=1");
}
