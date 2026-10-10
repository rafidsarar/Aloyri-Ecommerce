export const homepageBlocks = [
  { id: "hero", label: "Main hero and promotional carousel", group: "First impression" },
  { id: "browse", label: "Search and shopping shortcuts", group: "Discovery" },
  { id: "categories", label: "Category showcase", group: "Discovery" },
  { id: "brands", label: "Shop by brand", group: "Discovery" },
  { id: "focus", label: "Shop by skincare focus", group: "Discovery" },
  { id: "routineFinder", label: "Routine finder", group: "Discovery" },
  { id: "editorialBeforeProducts", label: "Editorial before products", group: "Content" },
  { id: "promoBeforeProducts", label: "Promotional banners (before products)", group: "Promotions" },
  { id: "products", label: "Product collections and campaigns", group: "Shopping" },
  { id: "editorialAfterProducts", label: "Editorial after products", group: "Content" },
  { id: "promoAfterProducts", label: "Promotional banners (after products)", group: "Promotions" },
  { id: "routineSteps", label: "Three-step routine", group: "Discovery" },
  { id: "editorialBeforeStory", label: "Editorial before brand story", group: "Content" },
  { id: "brandStory", label: "Brand story", group: "Content" },
] as const;

export type HomepageBlockId = (typeof homepageBlocks)[number]["id"];
export const defaultHomepageOrder: HomepageBlockId[] = homepageBlocks.map((item) => item.id);
const allowedBlocks = new Set<string>(defaultHomepageOrder);

export function normalizeHomepageOrder(value: unknown): HomepageBlockId[] {
  const input = Array.isArray(value) ? value : [];
  const unique = new Set<HomepageBlockId>();
  for (const item of input) {
    if (typeof item === "string" && allowedBlocks.has(item)) {
      unique.add(item as HomepageBlockId);
    }
  }
  for (const id of defaultHomepageOrder) unique.add(id);
  return [...unique];
}

export function safeHomepageImagePath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^media\/[a-zA-Z0-9][a-zA-Z0-9._/-]{0,180}\.(?:png|jpe?g|webp)$/.test(value) ||
    value.includes("..")
  ) return "";
  return value;
}
