import type { Product } from "@/lib/catalog";

/** Categories come from CRM product records, never a fixed storefront allowlist. */
export function categoryKey(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function catalogCategories(
  products: ReadonlyArray<Pick<Product, "category" | "active">>,
  preferredOrder: readonly string[] = [],
): string[] {
  const categories = new Map<string, string>();
  for (const product of products) {
    // Inactive CRM products must not become publicly discoverable.
    if (product.active === false || typeof product.category !== "string") continue;
    const category = product.category.normalize("NFKC").trim().replace(/\s+/g, " ");
    const key = categoryKey(category);
    if (!key || categories.has(key)) continue;
    categories.set(key, category);
  }
  const priority = new Map(preferredOrder.map((name, index) => [categoryKey(name), index]));
  return [...categories.values()].sort(
    (a, b) =>
      (priority.get(categoryKey(a)) ?? Number.MAX_SAFE_INTEGER) -
        (priority.get(categoryKey(b)) ?? Number.MAX_SAFE_INTEGER) ||
      a.localeCompare(b, "en", { sensitivity: "base" }),
  );
}

export function categoryMatches(a: string, b: string) {
  return categoryKey(a) === categoryKey(b);
}

export function categorySlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Preserve existing category SEO routes; use lossless query links for arbitrary CRM names. */
export function categoryHref(value: string) {
  const key = categoryKey(value);
  if (key === "cleanser") return "/category/cleansers";
  if (key === "moisturizer") return "/category/moisturizers";
  if (key === "sunscreen") return "/category/sunscreen";
  return "/shop?category=" + encodeURIComponent(value);
}

/** Optional direct category URLs, including old aliases, resolve only real active CRM categories. */
export function resolveCategorySlug(slug: string, categories: readonly string[]) {
  const aliases: Record<string, string> = {
    cleansers: "cleanser",
    moisturizers: "moisturizer",
    sunscreen: "sunscreen",
  };
  const key = aliases[slug] ?? slug;
  const matches = categories.filter((category) => categorySlug(category) === key || categoryKey(category) === key);
  return matches.length === 1 ? matches[0] : null;
}
