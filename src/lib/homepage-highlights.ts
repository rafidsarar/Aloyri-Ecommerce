/**
 * Suppress legacy marketing placeholders from the homepage and Admin preview.
 * Real, merchant-authored highlights remain editable in Storefront Builder.
 */
const PLACEHOLDER_HIGHLIGHTS = new Set([
  "curated selection",
  "bdt pricing",
  "bangladesh-first storefront",
]);

export function normalizeHomepageHighlights(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && !PLACEHOLDER_HIGHLIGHTS.has(item.toLowerCase()))
    .slice(0, 6);
}
