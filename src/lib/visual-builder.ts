import { defaultHomepageOrder, type HomepageBlockId, safeHomepageImagePath } from "@/lib/homepage-builder";

/**
 * A strict, declarative component registry. Customer-editable data never becomes
 * JavaScript, HTML, CSS or a remote embed on the public storefront.
 */
export const visualComponentCatalog = [
  { kind: "text", name: "Text & heading", description: "Editorial heading, paragraph and optional link" },
  { kind: "image", name: "Image feature", description: "An image from the Aloyri media library with accompanying text" },
  { kind: "cta", name: "Call to action", description: "A highlighted panel with a button" },
  { kind: "features", name: "Feature cards", description: "Up to four benefits or shopping highlights" },
  { kind: "quote", name: "Quote or review", description: "A styled quotation without unverifiable ratings" },
  { kind: "faq", name: "Questions & answers", description: "Expandable customer questions" },
  { kind: "spacer", name: "Spacer", description: "Adjust vertical breathing room" },
  { kind: "divider", name: "Divider", description: "A subtle section separator" },
] as const;

export type VisualBlockKind = (typeof visualComponentCatalog)[number]["kind"];
export type VisualBlock = {
  id: string;
  kind: VisualBlockKind;
  enabled: boolean;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imagePath: string;
  items: string[];
  align: "left" | "center";
  tone: "light" | "rose" | "sage" | "dark";
  spacing: "compact" | "regular" | "spacious";
  hideMobile: boolean;
  hideDesktop: boolean;
};
export type VisualLayout = { order: string[]; blocks: VisualBlock[]; hiddenCore: HomepageBlockId[] };

export const visualPageKeys = ["about", "shipping", "returns", "contact", "faq", "shop", "category", "product"] as const;
export type VisualPageKey = (typeof visualPageKeys)[number];
export const visualPageNames: Record<VisualPageKey, string> = {
  about: "About page",
  shipping: "Shipping & delivery",
  returns: "Returns & refunds",
  contact: "Contact",
  faq: "FAQ",
  shop: "Shop",
  category: "Category pages",
  product: "Product pages",
};

export const coreBlockId = (id: HomepageBlockId) => `core:${id}`;
export const customBlockId = (id: string) => `custom:${id}`;
export const defaultVisualOrder = defaultHomepageOrder.map(coreBlockId);
export const defaultVisualLayout: VisualLayout = { order: [...defaultVisualOrder], blocks: [], hiddenCore: [] };
const allowedCore = new Set(defaultVisualOrder);
const allowedKinds = new Set<string>(visualComponentCatalog.map(({ kind }) => kind));

export function safeBuilderHref(value: unknown) {
  if (typeof value !== "string") return "";
  const href = value.trim().slice(0, 200);
  return /^\/(?!\/)[A-Za-z0-9/_?=&.#%-]*$/.test(href) || /^#[A-Za-z0-9_-]{1,64}$/.test(href) ? href : "";
}

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

export function normalizeVisualBlock(value: unknown): VisualBlock | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const block = value as Record<string, unknown>;
  if (typeof block.id !== "string" || !/^[a-z0-9][a-z0-9-]{2,47}$/.test(block.id)) return null;
  if (!allowedKinds.has(String(block.kind))) return null;
  const items = Array.isArray(block.items) ? block.items : [];
  return {
    id: block.id,
    kind: block.kind as VisualBlockKind,
    enabled: block.enabled !== false,
    eyebrow: clean(block.eyebrow, 100),
    title: clean(block.title, 180),
    body: clean(block.body, 1200),
    ctaLabel: clean(block.ctaLabel, 70),
    ctaHref: safeBuilderHref(block.ctaHref),
    imagePath: safeHomepageImagePath(block.imagePath),
    items: items.filter((item): item is string => typeof item === "string").slice(0, 8).map(item => item.trim().slice(0, 250)).filter(Boolean),
    align: enumValue(block.align, ["left", "center"] as const, "left"),
    tone: enumValue(block.tone, ["light", "rose", "sage", "dark"] as const, "light"),
    spacing: enumValue(block.spacing, ["compact", "regular", "spacious"] as const, "regular"),
    hideMobile: block.hideMobile === true,
    hideDesktop: block.hideDesktop === true,
  };
}

export function normalizeVisualLayout(value: unknown, legacyOrder: HomepageBlockId[] = [...defaultHomepageOrder]): VisualLayout {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const seenIds = new Set<string>();
  const blocks = (Array.isArray(input.blocks) ? input.blocks : []).slice(0, 32).flatMap(raw => {
    const block = normalizeVisualBlock(raw);
    if (!block || seenIds.has(block.id)) return [];
    seenIds.add(block.id);
    return [block];
  });
  const valid = new Set([...defaultVisualOrder, ...blocks.map(block => customBlockId(block.id))]);
  const seen = new Set<string>();
  const result: string[] = [];
  const order = Array.isArray(input.order) && input.order.length
    ? input.order : legacyOrder.map(coreBlockId);
  for (const id of order) {
    if (typeof id === "string" && valid.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  // On core-only legacy homepages, insert new features alongside their natural
  // anchors. Custom page layouts keep their original order and append new blocks,
  // so editor-positioned sections never move unexpectedly during an upgrade.
  if (!result.some(id => id.startsWith("custom:"))) {
    for (const [newId, anchor] of [["core:trust", "core:hero"], ["core:brands", "core:categories"]]) {
      if (!seen.has(newId) && result.includes(anchor) && valid.has(newId)) {
        result.splice(result.indexOf(anchor) + 1, 0, newId);
        seen.add(newId);
      }
    }
  }
  for (const id of [...legacyOrder.map(coreBlockId), ...blocks.map(block => customBlockId(block.id))]) {
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  const hiddenCore = (Array.isArray(input.hiddenCore) ? input.hiddenCore : []).filter(
    (id): id is HomepageBlockId => typeof id === "string" && allowedCore.has(coreBlockId(id as HomepageBlockId)),
  );
  return { order: result, blocks, hiddenCore: [...new Set(hiddenCore)] };
}

/** Extra editorial content for other page templates; core commerce UI is never replaced. */
export function normalizeVisualPageLayout(value: unknown): VisualLayout {
  const base = normalizeVisualLayout(value, []);
  return { order: base.order.filter(id => id.startsWith("custom:")), blocks: base.blocks, hiddenCore: [] };
}

/** Keep custom blocks anchored to their nearest preceding core section when legacy
 * homepage settings reorder built-in sections. This prevents a saved banner edit
 * from silently discarding the visual builder's custom placement. */
export function reorderVisualCoreSections(layout: VisualLayout, newCoreOrder: HomepageBlockId[]): VisualLayout {
  const sections = new Map<string, string[]>();
  let anchor = "";
  for (const id of layout.order) {
    if (allowedCore.has(id)) {
      anchor = id;
    } else if (id.startsWith("custom:") && layout.blocks.some(block => customBlockId(block.id) === id)) {
      sections.set(anchor, [...(sections.get(anchor) || []), id]);
    }
  }
  const ordered = [...(sections.get("") || [])];
  for (const core of newCoreOrder) {
    const id = coreBlockId(core);
    ordered.push(id, ...(sections.get(id) || []));
  }
  return normalizeVisualLayout({ ...layout, order: ordered }, newCoreOrder);
}
