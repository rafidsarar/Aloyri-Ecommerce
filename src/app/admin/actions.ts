"use server";
import { normalizeHeroProductIds, normalizeHeroDiscountMode, normalizeHeroPromotionCode } from "@/lib/hero-banner-offers";

import { normalizePresentation, safeNavigationHref } from "@/lib/storefront-presentation";
import { normalizeHomepageOrder, safeHomepageImagePath } from "@/lib/homepage-builder";
import { normalizeVisualLayout, normalizeVisualPageLayout, reorderVisualCoreSections, visualPageKeys, type VisualPageKey } from "@/lib/visual-builder";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  authenticateAdmin,
  changeAdminPassword,
  createAdminOwner,
  createAdminSession,
  currentAdmin,
  generateAdminRecoveryCodes,
  noteAdminLogin,
  requireAdminPermission,
  resetAdminPasswordWithRecoveryCode,
  rotateAdminSessions,
} from "@/lib/admin-auth";
import { rateAllowed } from "@/lib/request-rate-limit";
import {
  restoreStorefrontVersionToDraft,
  readDraftStorefrontConfig,
  updateDraftStorefrontConfig,
  uploadStorefrontMedia,
  type InfoPageContent,
  type ProductEditorial,
  type StorefrontConfig,
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
  if (/^\/[A-Za-z0-9/_?=&.#%-]*$/.test(href) && !href.startsWith("//")) {
    return href;
  }
  return fallback;
}

function safePreviewPath(value: string) {
  const path = value.trim();
  if (/^\/[A-Za-z0-9/_?=&.#%-]*$/.test(path) && !path.startsWith("//")) {
    return path;
  }
  return "/";
}

async function requestIp() {
  const incoming = await headers();
  return (
    incoming.get("x-vercel-forwarded-for") ||
    incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function revalidatePublishedStorefront() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/category/[category]", "page");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/about");
  revalidatePath("/faq");
  revalidatePath("/contact");
  revalidatePath("/shipping-delivery");
  revalidatePath("/returns-refunds");
  revalidatePath("/customer-care");
  revalidatePath("/privacy");
  revalidatePath("/terms");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
  revalidatePath("/api/catalog");
}

export async function setupAdminOwner(formData: FormData) {
  const ip = await requestIp();
  if (!await rateAllowed("admin-setup", ip, 5, 60 * 60 * 1000)) {
    redirect(
      "/admin/setup?error=" +
        encodeURIComponent("Too many setup attempts. Try again later."),
    );
  }

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
  const ip = await requestIp();
  if (!await rateAllowed("admin-login", ip, 10, 15 * 60 * 1000)) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Too many sign-in attempts. Try again in 15 minutes."),
    );
  }

  const username = text(formData, "username", 48);
  const password = text(formData, "password", 128);
  const account = await authenticateAdmin(username, password);

  if (!account) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Username or password is incorrect."),
    );
  }

  await setSession(account.username);
  await noteAdminLogin(account.username);
  if (account.mustChangePassword) {
    redirect("/admin/security?mustChange=1");
  }
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

export async function updateAdminPassword(formData: FormData) {
  const admin = await requireAdminPermission("security.self");
  const currentPassword = text(formData, "currentPassword", 128);
  const newPassword = text(formData, "newPassword", 128);
  const confirmPassword = text(formData, "confirmPassword", 128);

  if (newPassword !== confirmPassword) {
    redirect(
      "/admin/security?passwordError=" +
        encodeURIComponent("New passwords do not match."),
    );
  }

  try {
    await changeAdminPassword(
      admin.username,
      currentPassword,
      newPassword,
    );
    await setSession(admin.username);
  } catch (error) {
    redirect(
      "/admin/security?passwordError=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/security?passwordChanged=1");
}

export async function rotateAllAdminSessions() {
  const admin = await requireAdminPermission("security.self");
  await rotateAdminSessions(admin.username);
  await setSession(admin.username);
  redirect("/admin/security?sessionsRotated=1");
}

export type RecoveryCodeActionState = {
  error?: string;
  codes?: string[];
};

export async function generateRecoveryCodesAction(
  _previous: RecoveryCodeActionState | null,
  formData: FormData,
): Promise<RecoveryCodeActionState> {
  const admin = await currentAdmin();
  if (!admin) return { error: "Your admin session has expired. Sign in again." };

  const ip = await requestIp();
  if (!await rateAllowed("admin-recovery-generate", ip, 5, 60 * 60 * 1000)) {
    return { error: "Too many recovery-code requests. Try again later." };
  }

  try {
    const codes = await generateAdminRecoveryCodes(
      admin.username,
      text(formData, "currentPassword", 128),
    );
    return { codes };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function recoverAdminAccount(formData: FormData) {
  const ip = await requestIp();
  if (!await rateAllowed("admin-recover", ip, 6, 60 * 60 * 1000)) {
    redirect(
      "/admin/recover?error=" +
        encodeURIComponent("Too many recovery attempts. Try again later."),
    );
  }

  const username = text(formData, "username", 48);
  const recoveryCode = text(formData, "recoveryCode", 64);
  const newPassword = text(formData, "newPassword", 128);
  const confirmPassword = text(formData, "confirmPassword", 128);

  if (newPassword !== confirmPassword) {
    redirect(
      "/admin/recover?error=" +
        encodeURIComponent("New passwords do not match."),
    );
  }

  try {
    await resetAdminPasswordWithRecoveryCode(
      username,
      recoveryCode,
      newPassword,
    );
    await setSession(username.trim());
  } catch {
    redirect(
      "/admin/recover?error=" +
        encodeURIComponent("Recovery details are not valid."),
    );
  }

  redirect("/admin/security?recovered=1");
}

export async function restoreVersionToDraftAction(formData: FormData) {
  const admin = await requireAdminPermission("publishing.restore");
  if (admin.role !== "owner") redirect("/admin?forbidden=1");
  const versionId = text(formData, "versionId", 64);
  try {
    await restoreStorefrontVersionToDraft(admin.username, versionId);
  } catch (error) {
    redirect(
      "/admin/history?error=" + encodeURIComponent(errorMessage(error)),
    );
  }
  redirect("/admin/history?restored=1");
}

function applyHomepageControls(config: StorefrontConfig, formData: FormData) {
  let requestedOrder: unknown;
  try {
    requestedOrder = JSON.parse(text(formData, "sectionOrder", 3000));
  } catch {
    requestedOrder = null;
  }

    config.site.appearance = ["rose", "sage", "sand"].includes(text(formData, "appearance", 10))
      ? text(formData, "appearance", 10) as "rose" | "sage" | "sand"
      : config.site.appearance;
    config.presentation = normalizePresentation({
      ...config.presentation,
      contentWidth: text(formData, "contentWidth", 20) || config.presentation.contentWidth,
      desktopColumns: Number(formData.get("desktopColumns")) || config.presentation.desktopColumns,
      showHeroImageOnMobile: formData.get("showHeroImageOnMobile") === "on",
      showRoutine: formData.get("showRoutine") === "on",
    });

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
      heroProductId: text(formData, "heroProductId", 120) || config.homepage.heroProductId,
      heroProductIds: normalizeHeroProductIds(formData.getAll("heroProductIds")),
      heroDiscountMode: normalizeHeroDiscountMode(formData.get("heroDiscountMode")),
      heroPromotionCode: normalizeHeroPromotionCode(formData.get("heroPromotionCode")),
      heroImagePath: safeHomepageImagePath(text(formData, "heroImagePath", 200)),
      heroStyle: ["soft", "minimal", "contrast"].includes(text(formData, "heroStyle", 10))
        ? text(formData, "heroStyle", 10) as "soft" | "minimal" | "contrast"
        : config.homepage.heroStyle,
      heroAlignment: formData.get("heroAlignment") === "center" ? "center" : "left",
      sectionOrder: requestedOrder ? normalizeHomepageOrder(requestedOrder) : config.homepage.sectionOrder,
      showBrowse: formData.get("showBrowse") === "on",
      browseEyebrow: text(formData, "browseEyebrow", 90),
      browseTitle: text(formData, "browseTitle", 140),
      browseIntro: text(formData, "browseIntro", 300),
      browsePlaceholder: text(formData, "browsePlaceholder", 100),
      showFocus: formData.get("showFocus") === "on",
      showRoutineSteps: formData.get("showRoutineSteps") === "on",
      categoriesEyebrow: text(formData, "categoriesEyebrow", 90),
      categoriesTitle: text(formData, "categoriesTitle", 140),
      categoriesIntro: text(formData, "categoriesIntro", 300),
      featureChips: list(text(formData, "featureChips", 1000), 6, 80),
      ideaEyebrow: text(formData, "ideaEyebrow", 120),
      ideaHeadline: text(formData, "ideaHeadline", 180),
      ideaCopy: text(formData, "ideaCopy", 600),
      showHero: formData.get("showHero") === "on",
      showRoutineFinder: formData.get("showRoutineFinder") === "on",
      routineFinderHeadline: text(formData, "routineFinderHeadline", 140),
      routineFinderIntro: text(formData, "routineFinderIntro", 420),
      heroLayout: formData.get("heroLayout") === "stacked" ? "stacked" : "split",
      showCategories: formData.get("showCategories") === "on",
      showBrandStory: formData.get("showBrandStory") === "on",
      promoPlacement: formData.get("promoPlacement") === "after-products" ? "after-products" : "before-products",
      promoBanners: Array.from({ length: 4 }, (_, index) => {
        const prefix = `promo${index}`;
        return {
          enabled: formData.get(`${prefix}Enabled`) === "on",
          eyebrow: text(formData, `${prefix}Eyebrow`, 80),
          title: text(formData, `${prefix}Title`, 160),
          copy: text(formData, `${prefix}Copy`, 360),
          ctaLabel: text(formData, `${prefix}CtaLabel`, 60),
          ctaHref: safeHref(text(formData, `${prefix}CtaHref`, 160), ""),
          layout: formData.get(`${prefix}Layout`) === "centered" ? "centered" as const : "split" as const,
          mobileLayout: formData.get(`${prefix}MobileLayout`) === "compact" ? "compact" as const : "stacked" as const,
          imagePath: text(formData, `${prefix}ImagePath`, 200),
          productIds: normalizeHeroProductIds(formData.getAll(`${prefix}ProductIds`)),
          discountMode: normalizeHeroDiscountMode(formData.get(`${prefix}DiscountMode`)),
          promotionCode: normalizeHeroPromotionCode(formData.get(`${prefix}PromotionCode`)),
          startAt: text(formData, `${prefix}StartAt`, 16),
          endAt: text(formData, `${prefix}EndAt`, 16),
        };
      }).filter((banner) => banner.title || banner.copy),
      editorialSections: Array.from({ length: 6 }, (_, index) => {
        const prefix = `editorial${index}`;
        return {
          enabled: formData.get(`${prefix}Enabled`) === "on",
          kind: text(formData, `${prefix}Kind`, 20) as "story" | "testimonial" | "faq" | "announcement",
          title: text(formData, `${prefix}Title`, 160),
          eyebrow: text(formData, `${prefix}Eyebrow`, 80),
          copy: text(formData, `${prefix}Copy`, 800),
          ctaLabel: text(formData, `${prefix}CtaLabel`, 60),
          ctaHref: safeHref(text(formData, `${prefix}CtaHref`, 160), ""),
          position: text(formData, `${prefix}Position`, 30) as "before-products" | "after-products" | "before-story",
          layout: formData.get(`${prefix}Layout`) === "centered" ? "centered" as const : "split" as const,
        };
      }).filter((section) => section.title || section.copy),

    };
    config.homepage.visualLayout = reorderVisualCoreSections(config.homepage.visualLayout, config.homepage.sectionOrder);
    const layout = config.homepage.visualLayout;
    // Old homepage controls and the visual studio must agree on visibility.
    const legacyVisibility = [
      ["hero", config.homepage.showHero],
      ["browse", config.homepage.showBrowse],
      ["categories", config.homepage.showCategories],
      ["focus", config.homepage.showFocus],
      ["routineFinder", config.homepage.showRoutineFinder],
      ["routineSteps", config.homepage.showRoutineSteps],
      ["brandStory", config.homepage.showBrandStory],
    ] as const;
    const managed = new Set<string>(legacyVisibility.map(([id]) => id));
    layout.hiddenCore = [
      ...layout.hiddenCore.filter(id => !managed.has(id)),
      ...legacyVisibility.filter(([, visible]) => !visible).map(([id]) => id),
    ];
  return config;
}

export async function saveHomepage(formData: FormData) {
  const admin = await requireAdminPermission("homepage.edit");
  await updateDraftStorefrontConfig(config => applyHomepageControls(config, formData), {
    actor: admin.username,
    action: "content.homepage_updated",
    scope: "homepage",
  });
  redirect("/admin/builder?view=advanced&saved=1");
}

export async function saveVisualBuilder(formData: FormData) {
  const admin = await requireAdminPermission("homepage.edit");
  let requested: unknown;
  try {
    requested = JSON.parse(text(formData, "layout", 50000));
  } catch {
    redirect("/admin/builder?error=invalid");
  }
  if (!requested || typeof requested !== "object" || Array.isArray(requested) ||
      !Array.isArray((requested as Record<string, unknown>).order) ||
      !Array.isArray((requested as Record<string, unknown>).blocks)) {
    redirect("/admin/builder?error=invalid");
  }

  const pageKey = text(formData, "pageKey", 24);
  const selected = pageKey === "home" ? "home" : visualPageKeys.includes(pageKey as VisualPageKey) ? pageKey as VisualPageKey : null;
  if (!selected) redirect("/admin/builder?error=invalid");
  // Updating existing informational content requires its own page-edit permission.
  // Visual layout permissions alone must not grant access to page content edits.
  let pageDraft: { eyebrow: string; title: string; intro: string; sectionTitles: string[] } | null = null;
  const rawPage = formData.get("pageContent");
  if (rawPage !== null) {
    if (!["about", "shipping", "returns", "contact"].includes(selected)) redirect("/admin/builder?error=invalid");
    await requireAdminPermission("pages.edit");
    try {
      const value = JSON.parse(String(rawPage)) as Record<string, unknown>;
      if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.sections)) throw Error("Invalid page");
      const readField = (key: string, max: number) => {
        const field = value[key];
        if (typeof field !== "string" || field.length > max) throw Error("Invalid field");
        return field;
      };
      const sectionTitles = value.sections.map((section: unknown) => {
        if (!section || typeof section !== "object" || Array.isArray(section)) throw Error("Invalid section");
        const title = (section as Record<string, unknown>).title;
        if (typeof title !== "string" || title.length > 180) throw Error("Invalid heading");
        return title;
      });
      if (sectionTitles.length > 12) throw Error("Too many sections");
      pageDraft = { eyebrow: readField("eyebrow", 120), title: readField("title", 180), intro: readField("intro", 1000), sectionTitles };
    } catch { redirect("/admin/builder?error=invalid"); }
  }
  let siteDraft: { announcement?: string; footerDescription?: string } | null = null;
  const rawSite = formData.get("siteContent");
  if (rawSite !== null) {
    try {
      const edited = JSON.parse(String(rawSite)) as Record<string, unknown>;
      const baseline = JSON.parse(String(formData.get("siteBaseline") || "{}")) as Record<string, unknown>;
      if (!edited || typeof edited !== "object" || !baseline || typeof baseline !== "object") throw Error("Invalid site");
      if (typeof edited.announcement !== "string" || edited.announcement.length > 180 ||
          typeof edited.footerDescription !== "string" || edited.footerDescription.length > 600) throw Error("Invalid site fields");
      const changes: { announcement?: string; footerDescription?: string } = {};
      if (edited.announcement !== baseline.announcement) changes.announcement = edited.announcement;
      if (edited.footerDescription !== baseline.footerDescription) changes.footerDescription = edited.footerDescription;
      if (Object.keys(changes).length) {
        await requireAdminPermission("settings.edit");
        siteDraft = changes;
      }
    } catch { redirect("/admin/builder?error=invalid"); }
  }
  await updateDraftStorefrontConfig(config => {
    if (siteDraft) Object.assign(config.site, siteDraft);
    if (selected === "home") {
      const before = structuredClone(config.homepage.visualLayout);
      const beforeOrder = [...config.homepage.sectionOrder];
      const fullControls = formData.get("homepageControls") === "1";
      if (fullControls) applyHomepageControls(config, formData);
      let layout = normalizeVisualLayout(requested, beforeOrder);
      const advancedOrderChanged = JSON.stringify(beforeOrder) !== JSON.stringify(config.homepage.sectionOrder);
      const canvasOrderChanged = JSON.stringify(before.order) !== JSON.stringify(layout.order);
      if (fullControls && advancedOrderChanged && !canvasOrderChanged) {
        layout = reorderVisualCoreSections(layout, config.homepage.sectionOrder);
      }
      const canvasVisibilityChanged = JSON.stringify([...before.hiddenCore].sort()) !== JSON.stringify([...layout.hiddenCore].sort());
      if (fullControls && !canvasVisibilityChanged) {
        const visibility = [
          ["hero", config.homepage.showHero],
          ["browse", config.homepage.showBrowse],
          ["categories", config.homepage.showCategories],
          ["focus", config.homepage.showFocus],
          ["routineFinder", config.homepage.showRoutineFinder],
          ["routineSteps", config.homepage.showRoutineSteps],
          ["brandStory", config.homepage.showBrandStory],
        ] as const;
        const managed = new Set<string>(visibility.map(([id]) => id));
        layout.hiddenCore = [
          ...layout.hiddenCore.filter(id => !managed.has(id)),
          ...visibility.filter(([, visible]) => !visible).map(([id]) => id),
        ];
      }
      // Only canvas fields changed relative to their initial values override advanced controls.
      const rawCore = text(formData, "coreContent", 12000);
      const rawBaseline = text(formData, "coreBaseline", 12000);
      if (rawCore) {
        let edited: Record<string, unknown>;
        let baseline: Record<string, unknown> = {};
        try {
          edited = JSON.parse(rawCore) as Record<string, unknown>;
          if (rawBaseline) baseline = JSON.parse(rawBaseline) as Record<string, unknown>;
        } catch { redirect("/admin/builder?error=invalid"); }
        if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) redirect("/admin/builder?error=invalid");
        if (!edited || typeof edited !== "object" || Array.isArray(edited)) redirect("/admin/builder?error=invalid");
        const stringFields = { eyebrow: 100, headline: 180, intro: 1200, primaryLabel: 70, secondaryLabel: 70, browseEyebrow: 90, browseTitle: 140, browseIntro: 600, browsePlaceholder: 100, categoriesEyebrow: 90, categoriesTitle: 140, categoriesIntro: 600, routineFinderHeadline: 180, routineFinderIntro: 1200, ideaEyebrow: 90, ideaHeadline: 180, ideaCopy: 1200 } as const;
        for (const [key, limit] of Object.entries(stringFields)) {
          if (typeof edited[key] !== "string" || edited[key].length > limit) redirect("/admin/builder?error=invalid");
          if (edited[key] !== baseline[key]) (config.homepage as unknown as Record<string, unknown>)[key] = edited[key];
        }
        for (const key of ["primaryHref", "secondaryHref"] as const) {
          if (typeof edited[key] !== "string" || !safeHref(edited[key], "")) redirect("/admin/builder?error=invalid");
          if (edited[key] !== baseline[key]) config.homepage[key] = edited[key];
        }
        if (typeof edited.heroImagePath !== "string" || (edited.heroImagePath !== "" && !safeHomepageImagePath(edited.heroImagePath))) redirect("/admin/builder?error=invalid");
        if (edited.heroImagePath !== baseline.heroImagePath) config.homepage.heroImagePath = edited.heroImagePath;
        if (!["soft", "minimal", "contrast"].includes(String(edited.heroStyle)) || !["split", "stacked"].includes(String(edited.heroLayout)) || !["left", "center"].includes(String(edited.heroAlignment))) redirect("/admin/builder?error=invalid");
        if (edited.heroStyle !== baseline.heroStyle) config.homepage.heroStyle = edited.heroStyle as typeof config.homepage.heroStyle;
        if (edited.heroLayout !== baseline.heroLayout) config.homepage.heroLayout = edited.heroLayout as typeof config.homepage.heroLayout;
        if (edited.heroAlignment !== baseline.heroAlignment) config.homepage.heroAlignment = edited.heroAlignment as typeof config.homepage.heroAlignment;
      }
      config.homepage.visualLayout = layout;
      config.homepage.showHero = !layout.hiddenCore.includes("hero");
      config.homepage.showBrowse = !layout.hiddenCore.includes("browse");
      config.homepage.showCategories = !layout.hiddenCore.includes("categories");
      config.homepage.showFocus = !layout.hiddenCore.includes("focus");
      config.homepage.showRoutineFinder = !layout.hiddenCore.includes("routineFinder");
      config.homepage.showRoutineSteps = !layout.hiddenCore.includes("routineSteps");
      config.homepage.showBrandStory = !layout.hiddenCore.includes("brandStory");
      config.homepage.sectionOrder = normalizeHomepageOrder(
        layout.order.filter(id => id.startsWith("core:")).map(id => id.slice(5)),
      );
    } else {
      config.visualPages[selected] = normalizeVisualPageLayout(requested);
      if (pageDraft && (selected === "about" || selected === "shipping" || selected === "returns" || selected === "contact")) {
        const page = config.pages[selected];
        if (page.sections.length !== pageDraft.sectionTitles.length) redirect("/admin/builder?error=invalid");
        page.eyebrow = pageDraft.eyebrow;
        page.title = pageDraft.title;
        page.intro = pageDraft.intro;
        page.sections = page.sections.map((section, index) => ({ ...section, title: pageDraft!.sectionTitles[index] }));
      }
    }
    return config;
  }, {
    actor: admin.username,
    action: "homepage.visual_builder_saved",
    scope: "homepage",
    target: selected,
    detail: "Visual website layout updated live.",
  });
  redirect("/admin/builder?page=" + selected + "&saved=1");
}

export async function saveSiteSettings(formData: FormData) {
  const admin = await requireAdminPermission("settings.edit");
  for (let i=0;i<5;i++) {
    const label=text(formData,`navLabel${i}`,30); const href=text(formData,`navHref${i}`,160);
    if ((label || href) && (!label || !safeNavigationHref(href))) redirect("/admin/settings?error="+encodeURIComponent(`Menu item ${i+1} needs a label and a valid storefront destination.`));
  }

  await updateDraftStorefrontConfig((config) => {
    config.presentation = normalizePresentation({
      contentWidth: text(formData,"contentWidth",20),
      desktopColumns: Number(formData.get("desktopColumns")),
      showAnnouncement: formData.get("showAnnouncement") === "on",
      stickyHeader: formData.get("stickyHeader") === "on",
      showRoutine: formData.get("showRoutine") === "on",
      showHeroImageOnMobile: formData.get("showHeroImageOnMobile") === "on",
      navigation: Array.from({length:5},(_,i)=>({label:text(formData,`navLabel${i}`,30),href:text(formData,`navHref${i}`,160)})),
    });
    config.site = {
      announcement: text(formData, "announcement", 180),
      footerDescription: text(formData, "footerDescription", 600),
      supportEmail: text(formData, "supportEmail", 200),
      supportPhone: text(formData, "supportPhone", 80),
      supportHours: text(formData, "supportHours", 200),
      appearance: ["rose", "sage", "sand"].includes(text(formData, "appearance", 10))
        ? text(formData, "appearance", 10) as "rose" | "sage" | "sand"
        : config.site.appearance,
    };
    return config;
  }, {
    actor: admin.username,
    action: "settings.updated",
    scope: "settings",
  });

  redirect("/admin/settings?saved=1");
}

export async function saveProductEditorial(formData: FormData) {
  const admin = await requireAdminPermission("products.edit");

  const productId = text(formData, "productId", 120);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(productId)) {
    redirect(
      "/admin/products?error=" + encodeURIComponent("Invalid product ID."),
    );
  }

  const existingConfig = await readDraftStorefrontConfig();
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

  await updateDraftStorefrontConfig((config) => {
    config.products[productId] = editorial;
    return config;
  }, {
    actor: admin.username,
    action: "product.editorial_updated",
    scope: "products",
    target: productId,
  });

  redirect(
    "/admin/products/" + encodeURIComponent(productId) + "?saved=1",
  );
}

const pageKeys = new Set(["about", "shipping", "returns", "contact"]);

export async function saveInfoPage(formData: FormData) {
  const admin = await requireAdminPermission("pages.edit");

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

  await updateDraftStorefrontConfig((config) => {
    config.pages[pageKey as keyof typeof config.pages] = {
      eyebrow: text(formData, "eyebrow", 120),
      title: text(formData, "title", 180),
      intro: text(formData, "intro", 1000),
      sections,
    };
    return config;
  }, {
    actor: admin.username,
    action: "content.page_updated",
    scope: "pages",
    target: pageKey,
  });

  redirect("/admin/pages/" + pageKey + "?saved=1");
}

export async function saveFaq(formData: FormData) {
  const admin = await requireAdminPermission("pages.edit");

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

  await updateDraftStorefrontConfig((config) => {
    config.faq = {
      eyebrow: text(formData, "eyebrow", 120),
      title: text(formData, "title", 180),
      intro: text(formData, "intro", 1000),
      items,
    };
    return config;
  }, {
    actor: admin.username,
    action: "content.faq_updated",
    scope: "pages",
    target: "faq",
  });

  redirect("/admin/pages/faq?saved=1");
}
