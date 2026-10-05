"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminOwner,
  createAdminSession,
  currentAdmin,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import {
  readStorefrontConfig,
  updateStorefrontConfig,
  uploadStorefrontMedia,
  type InfoPageContent,
  type ProductEditorial,
} from "@/lib/storefront-admin-store";

function text(formData: FormData, key: string, max = 4000) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function list(value: string, maxItems = 20, maxLength = 500) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}

function safeHref(value: string, fallback: string) {
  const href = value.trim();
  if (/^\/[A-Za-z0-9/_?=&.#%-]*$/.test(href)) return href;
  return fallback;
}

async function setSession(username: string) {
  const value = await createAdminSession(username);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

async function ensureAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function setupAdminOwner(formData: FormData) {
  const username = text(formData, "username", 48);
  const password = text(formData, "password", 128);
  const confirm = text(formData, "confirm", 128);

  let error = "";
  if (password !== confirm) {
    error = "Passwords do not match.";
  } else {
    try {
      const created = await createAdminOwner(username, password);
      await setSession(created);
    } catch (caught) {
      error = errorMessage(caught);
    }
  }

  if (error) {
    redirect("/admin/setup?error=" + encodeURIComponent(error));
  }
  redirect("/admin");
}

export async function loginAdmin(formData: FormData) {
  const username = text(formData, "username", 48);
  const password = text(formData, "password", 128);
  const valid = await verifyAdminCredentials(username, password);

  if (!valid) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Username or password is incorrect."),
    );
  }

  await setSession(username.trim());
  redirect("/admin");
}

export async function logoutAdmin() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  redirect("/admin/login");
}

export async function saveHomepage(formData: FormData) {
  await ensureAdmin();

  await updateStorefrontConfig((config) => {
    config.homepage = {
      ...config.homepage,
      eyebrow: text(formData, "eyebrow", 120),
      headline: text(formData, "headline", 180),
      intro: text(formData, "intro", 500),
      primaryLabel: text(formData, "primaryLabel", 80),
      primaryHref: safeHref(
        text(formData, "primaryHref", 200),
        config.homepage.primaryHref,
      ),
      secondaryLabel: text(formData, "secondaryLabel", 80),
      secondaryHref: safeHref(
        text(formData, "secondaryHref", 200),
        config.homepage.secondaryHref,
      ),
      heroProductId: text(formData, "heroProductId", 120),
      featureChips: list(text(formData, "featureChips", 1000), 6, 80),
      ideaEyebrow: text(formData, "ideaEyebrow", 120),
      ideaHeadline: text(formData, "ideaHeadline", 180),
      ideaCopy: text(formData, "ideaCopy", 600),
    };
    return config;
  });

  revalidatePath("/");
  redirect("/admin/homepage?saved=1");
}

export async function saveSiteSettings(formData: FormData) {
  await ensureAdmin();

  await updateStorefrontConfig((config) => {
    config.site = {
      announcement: text(formData, "announcement", 180),
      footerDescription: text(formData, "footerDescription", 600),
      supportEmail: text(formData, "supportEmail", 200),
      supportPhone: text(formData, "supportPhone", 80),
      supportHours: text(formData, "supportHours", 200),
    };
    return config;
  });

  revalidatePath("/", "layout");
  revalidatePath("/contact");
  redirect("/admin/settings?saved=1");
}

export async function saveProductEditorial(formData: FormData) {
  await ensureAdmin();

  const productId = text(formData, "productId", 120);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(productId)) {
    redirect(
      "/admin/products?error=" + encodeURIComponent("Invalid product ID."),
    );
  }

  const existingConfig = await readStorefrontConfig();
  const current = existingConfig.products[productId] || {};
  let mediaPath = current.mediaPath;

  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      mediaPath = await uploadStorefrontMedia(file);
    } catch (error) {
      redirect(
        "/admin/products/" +
          encodeURIComponent(productId) +
          "?error=" +
          encodeURIComponent(errorMessage(error)),
      );
    }
  }

  if (formData.get("removeMedia") === "on") {
    mediaPath = undefined;
  }

  const editorial: ProductEditorial = {
    slug: text(formData, "slug", 120) || current.slug,
    description: text(formData, "description", 1200),
    routineStep: text(formData, "routineStep", 180),
    skinNote: text(formData, "skinNote", 600),
    texture: text(formData, "texture", 180),
    bestFor: text(formData, "bestFor", 500),
    howToUse: list(text(formData, "howToUse", 4000), 12, 500),
    careNotes: list(text(formData, "careNotes", 4000), 12, 500),
    ingredientNote: text(formData, "ingredientNote", 1200),
    featured: formData.get("featured") === "on",
    bestseller: formData.get("bestseller") === "on",
    ...(mediaPath ? { mediaPath } : {}),
  };

  await updateStorefrontConfig((config) => {
    config.products[productId] = editorial;
    return config;
  });

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/api/catalog");
  redirect(
    "/admin/products/" + encodeURIComponent(productId) + "?saved=1",
  );
}

const pageKeys = new Set(["about", "shipping", "returns", "contact"]);

export async function saveInfoPage(formData: FormData) {
  await ensureAdmin();

  const pageKey = text(formData, "pageKey", 40);
  if (!pageKeys.has(pageKey)) redirect("/admin/pages");

  const sectionCount = Math.min(
    12,
    Math.max(0, Number(text(formData, "sectionCount", 3)) || 0),
  );
  const sections: InfoPageContent["sections"] = [];

  for (let index = 0; index < sectionCount; index += 1) {
    const title = text(formData, `section_${index}_title`, 180);
    const paragraphs = list(
      text(formData, `section_${index}_paragraphs`, 8000),
      8,
      1200,
    );
    const bullets = list(
      text(formData, `section_${index}_bullets`, 8000),
      16,
      600,
    );
    if (title || paragraphs.length || bullets.length) {
      sections.push({ title, paragraphs, bullets });
    }
  }

  await updateStorefrontConfig((config) => {
    config.pages[pageKey as keyof typeof config.pages] = {
      eyebrow: text(formData, "eyebrow", 120),
      title: text(formData, "title", 180),
      intro: text(formData, "intro", 1000),
      sections,
    };
    return config;
  });

  const publicPath =
    pageKey === "shipping"
      ? "/shipping-delivery"
      : pageKey === "returns"
        ? "/returns-refunds"
        : "/" + pageKey;
  revalidatePath(publicPath);
  redirect("/admin/pages/" + pageKey + "?saved=1");
}

export async function saveFaq(formData: FormData) {
  await ensureAdmin();

  const count = Math.min(
    30,
    Math.max(0, Number(text(formData, "itemCount", 3)) || 0),
  );
  const items: { question: string; answer: string }[] = [];
  for (let index = 0; index < count; index += 1) {
    const question = text(formData, `item_${index}_question`, 400);
    const answer = text(formData, `item_${index}_answer`, 1200);
    if (question && answer) items.push({ question, answer });
  }

  await updateStorefrontConfig((config) => {
    config.faq = {
      eyebrow: text(formData, "eyebrow", 120),
      title: text(formData, "title", 180),
      intro: text(formData, "intro", 1000),
      items,
    };
    return config;
  });

  revalidatePath("/faq");
  redirect("/admin/pages/faq?saved=1");
}
