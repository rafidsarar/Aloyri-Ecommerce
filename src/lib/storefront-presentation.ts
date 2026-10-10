export type StorefrontPresentation = {
  contentWidth: "comfortable" | "wide";
  desktopColumns: 3 | 4;
  showAnnouncement: boolean;
  stickyHeader: boolean;
  showRoutine: boolean;
  showHeroImageOnMobile: boolean;
  navigation: Array<{ label: string; href: string }>;
};
export const defaultPresentation: StorefrontPresentation = {
  contentWidth: "wide", desktopColumns: 4,
  showAnnouncement: true, stickyHeader: true,
  showRoutine: true, showHeroImageOnMobile: true,
  navigation: [
    { label: "Shop all", href: "/shop" },
    { label: "Bestsellers", href: "/shop?sort=bestseller" },
    { label: "Routine finder", href: "/routine-finder" },
  ],
};
export function safeNavigationHref(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 160) return null;
  if (/^\/(?:shop|about|routine-finder|faq|contact|shipping-delivery|returns-refunds)$/.test(value)) return value;
  if (value === "/shop?sort=bestseller") return value;
  if (/^\/category\/[a-z0-9][a-z0-9-]{0,100}$/.test(value)) return value;
  if (/^\/collections\/[a-z0-9][a-z0-9-]{0,79}$/.test(value)) return value;
  return null;
}
export function normalizePresentation(value: unknown): StorefrontPresentation {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const navigation = Array.isArray(input.navigation) ? input.navigation.slice(0,5).flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const label = typeof item.label === "string" ? item.label.trim().slice(0,30) : "";
    const href = safeNavigationHref(item.href);
    return label && href ? [{label,href}] : [];
  }) : defaultPresentation.navigation;
  const boolean = (key: keyof StorefrontPresentation) => typeof input[key] === "boolean" ? input[key] as boolean : defaultPresentation[key] as boolean;
  return {
    contentWidth: input.contentWidth === "comfortable" ? "comfortable" : "wide",
    desktopColumns: input.desktopColumns === 3 ? 3 : 4,
    showAnnouncement: boolean("showAnnouncement"), stickyHeader: boolean("stickyHeader"),
    showRoutine: boolean("showRoutine"),
    showHeroImageOnMobile: boolean("showHeroImageOnMobile"),
    navigation: navigation.length ? navigation : defaultPresentation.navigation.map(item=>({...item})),
  };
}
