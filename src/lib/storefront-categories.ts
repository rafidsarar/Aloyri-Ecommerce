/**
 * CRM owns the category registry. The website only derives public navigation
 * names and stable routes; no website-side category maintenance is required.
 */
export type StorefrontCategory = { name: string; slug: string; href: string };

const legacySlugs: Record<string, string> = {
  cleanser: "cleansers",
  cleansers: "cleansers",
  moisturizer: "moisturizers",
  moisturizers: "moisturizers",
  sunscreen: "sunscreen",
};

function key(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function cleanCategoryName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name && name.length <= 50 && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
}

function fallbackSuffix(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function slugForCategory(name: string) {
  const normalized = key(name);
  if (legacySlugs[normalized]) return legacySlugs[normalized];
  const ascii = normalized.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 75)
    .replace(/-$/g, "");
  return ascii || "category-" + fallbackSuffix(normalized);
}

export function categoryNamesFromCatalog(
  registered: readonly unknown[] | undefined,
  products: readonly { category: string }[] = [],
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of [...(Array.isArray(registered) ? registered : []), ...products.map(product => product.category)]) {
    const name = cleanCategoryName(value);
    if (!name || seen.has(key(name))) continue;
    seen.add(key(name));
    names.push(name);
  }
  return names;
}

export function buildCategoryDirectory(
  registered: readonly unknown[] | undefined,
  products: readonly { category: string }[] = [],
): StorefrontCategory[] {
  const names = categoryNamesFromCatalog(registered, products);
  const used = new Set<string>();
  return names.map(name => {
    let slug = slugForCategory(name);
    if (used.has(slug)) slug += "-" + fallbackSuffix(key(name));
    while (used.has(slug)) slug += "-2";
    used.add(slug);
    return { name, slug, href: "/category/" + encodeURIComponent(slug) };
  });
}

export function resolveCatalogCategory(
  slug: string,
  registered: readonly unknown[] | undefined,
  products: readonly { category: string }[] = [],
) {
  return buildCategoryDirectory(registered, products).find(item => item.slug === slug);
}

export function matchesCategory(a: string, b: string) {
  return key(a) === key(b);
}
