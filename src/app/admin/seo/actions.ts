"use server";

import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import {
  redirectValidationError,
  safeInternalPath,
} from "@/lib/seo-manager";
import {
  updateDraftStorefrontConfig,
  uploadStorefrontMedia,
  type SeoCategoryKey,
  type SeoEntry,
  type SeoPageKey,
  type SeoRedirect,
} from "@/lib/storefront-admin-store";

function text(formData: FormData, key: string, max = 4000) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function ensureAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function pageLocation(key: string) {
  if (key === "homepage" || key === "shop") {
    return { type: "root" as const, key: key as "homepage" | "shop" };
  }
  if (key.startsWith("category-")) {
    const category = key.slice("category-".length);
    if (["cleansers", "moisturizers", "sunscreen"].includes(category)) {
      return { type: "category" as const, key: category as SeoCategoryKey };
    }
  }
  if (
    ["about", "faq", "shipping", "returns", "contact", "customerCare", "privacy", "terms"].includes(
      key,
    )
  ) {
    return { type: "page" as const, key: key as SeoPageKey };
  }
  return null;
}

function entryFromForm(
  formData: FormData,
  canonicalFallback: string,
  ogImagePath?: string,
): SeoEntry {
  return {
    title: text(formData, "title", 120),
    description: text(formData, "description", 320),
    canonical: safeInternalPath(
      text(formData, "canonical", 400),
      canonicalFallback,
    ),
    index: bool(formData, "index"),
    follow: bool(formData, "follow"),
    ogTitle: text(formData, "ogTitle", 120),
    ogDescription: text(formData, "ogDescription", 320),
    ...(ogImagePath ? { ogImagePath } : {}),
  };
}

export async function savePageSeo(formData: FormData) {
  await ensureAdmin();
  const key = text(formData, "key", 60);
  const location = pageLocation(key);
  if (!location) redirect("/admin/seo?error=" + encodeURIComponent("Unknown SEO page."));

  try {
    await updateDraftStorefrontConfig((config) => {
      const current =
        location.type === "root"
          ? config.seo[location.key]
          : location.type === "category"
            ? config.seo.categories[location.key]
            : config.seo.pages[location.key];
      const canonicalFallback =
        location.type === "root"
          ? location.key === "homepage"
            ? "/"
            : "/shop"
          : location.type === "category"
            ? "/category/" + location.key
            : {
                about: "/about",
                faq: "/faq",
                shipping: "/shipping-delivery",
                returns: "/returns-refunds",
                contact: "/contact",
                customerCare: "/customer-care",
                privacy: "/privacy",
                terms: "/terms",
              }[location.key];

      // The file is handled in the second phase below.
      const next = entryFromForm(formData, canonicalFallback, current.ogImagePath);
      if (location.type === "root") {
        config.seo[location.key] = next;
      } else if (location.type === "category") {
        config.seo.categories[location.key] = next;
      } else {
        config.seo.pages[location.key] = next;
      }
      return config;
    });

    const file = formData.get("ogImage");
    const needsMediaChange =
      formData.get("removeOgImage") === "on" ||
      (file instanceof File && file.size > 0);

    if (needsMediaChange) {
      let uploaded: string | undefined;
      if (file instanceof File && file.size > 0) {
        uploaded = await uploadStorefrontMedia(file);
      }
      await updateDraftStorefrontConfig((config) => {
        const current =
          location.type === "root"
            ? config.seo[location.key]
            : location.type === "category"
              ? config.seo.categories[location.key]
              : config.seo.pages[location.key];
        const next = { ...current };
        if (uploaded) next.ogImagePath = uploaded;
        else delete next.ogImagePath;
        if (location.type === "root") config.seo[location.key] = next;
        else if (location.type === "category") config.seo.categories[location.key] = next;
        else config.seo.pages[location.key] = next;
        return config;
      });
    }
  } catch (error) {
    redirect(
      "/admin/seo/pages/" +
        encodeURIComponent(key) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/seo/pages/" + encodeURIComponent(key) + "?saved=1");
}

export async function saveProductSeo(formData: FormData) {
  await ensureAdmin();
  const productId = text(formData, "productId", 120);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(productId)) {
    redirect("/admin/seo/products?error=" + encodeURIComponent("Invalid product."));
  }

  try {
    let uploaded: string | undefined;
    const file = formData.get("ogImage");
    if (file instanceof File && file.size > 0) {
      uploaded = await uploadStorefrontMedia(file);
    }

    await updateDraftStorefrontConfig((config) => {
      const current = config.seo.products[productId] || {};
      const fallback = safeInternalPath(
        text(formData, "canonicalFallback", 400),
        "/product/" + productId,
      );
      const existingImage =
        formData.get("removeOgImage") === "on"
          ? undefined
          : uploaded || current.ogImagePath;
      config.seo.products[productId] = entryFromForm(
        formData,
        fallback,
        existingImage,
      );
      return config;
    });
  } catch (error) {
    redirect(
      "/admin/seo/products/" +
        encodeURIComponent(productId) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/seo/products/" + encodeURIComponent(productId) + "?saved=1");
}

export async function saveRedirects(formData: FormData) {
  await ensureAdmin();
  const count = Math.min(200, Math.max(0, Number(text(formData, "count", 4)) || 0));
  const redirects: SeoRedirect[] = [];

  for (let index = 0; index < count; index += 1) {
    if (formData.get(`remove_${index}`) === "on") continue;
    const from = text(formData, `from_${index}`, 400);
    const to = text(formData, `to_${index}`, 400);
    if (!from && !to) continue;

    const redirectRow: SeoRedirect = {
      id:
        text(formData, `id_${index}`, 64).replace(/[^a-f0-9]/gi, "").slice(0, 32) ||
        crypto.randomUUID().replace(/-/g, ""),
      from,
      to,
      permanent: formData.get(`permanent_${index}`) !== "off",
      active: formData.get(`active_${index}`) === "on",
    };
    const validation = redirectValidationError(redirectRow);
    if (validation) {
      redirect(
        "/admin/seo/redirects?error=" +
          encodeURIComponent(redirectRow.from + ": " + validation),
      );
    }
    redirects.push(redirectRow);
  }

  const activeSources = new Set<string>();
  for (const item of redirects.filter((redirectRow) => redirectRow.active)) {
    if (activeSources.has(item.from)) {
      redirect(
        "/admin/seo/redirects?error=" +
          encodeURIComponent("Only one active redirect can use source " + item.from),
      );
    }
    activeSources.add(item.from);
    if (
      redirects.some(
        (other) =>
          other.active && other.from === item.to && other.to === item.from,
      )
    ) {
      redirect(
        "/admin/seo/redirects?error=" +
          encodeURIComponent("Redirect loop detected for " + item.from),
      );
    }
  }

  await updateDraftStorefrontConfig((config) => {
    config.seo.redirects = redirects;
    return config;
  });

  redirect("/admin/seo/redirects?saved=1");
}
