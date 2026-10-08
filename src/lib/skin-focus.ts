import type { Product } from "@/lib/catalog";

export type SkinFocus = "all" | "hydration" | "lightweight" | "gentle" | "spf";

export const skinFocusOptions: { value: SkinFocus; label: string; description: string }[] = [
  { value: "all", label: "All focuses", description: "Explore all published skincare." },
  { value: "hydration", label: "Hydration", description: "Products described with hydration or comfort." },
  { value: "lightweight", label: "Light textures", description: "Explore descriptions highlighting light textures." },
  { value: "gentle", label: "Simple & gentle", description: "Explore simple, gentle daily care." },
  { value: "spf", label: "Daily SPF", description: "Sunscreens and products with SPF." },
];

// This is descriptive filtering, not medical advice or a suitability claim.
// Never invent benefit tags for products whose published text lacks them.
export function matchesSkinFocus(product: Product, focus: SkinFocus): boolean {
  if (focus === "all") return true;
  const text = [
    product.name, product.category, product.description, product.skinNote,
    product.bestFor, product.texture, product.routineStep,
  ].filter(Boolean).join(" ").toLowerCase();
  if (focus === "hydration") return /hydrat|moistur|nourish|comfort/.test(text);
  if (focus === "lightweight") return /lightweight|\blight\b|\bgel\b|weightless|non-greasy/.test(text);
  if (focus === "gentle") return /gentle|simple|comfortable|everyday|sensitive/.test(text);
  return /sunscreen|sunblock|\bspf\b|sun protection/.test(text);
}
