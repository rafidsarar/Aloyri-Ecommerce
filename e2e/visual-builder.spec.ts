import { test, expect } from "@playwright/test";
import {
  coreBlockId,
  defaultVisualOrder,
  normalizeVisualBlock,
  normalizeVisualLayout,
  normalizeVisualPageLayout,
  reorderVisualCoreSections,
  safeBuilderHref,
} from "../src/lib/visual-builder";

const custom = {
  id: "my-new-block",
  kind: "cta",
  enabled: true,
  title: "Seasonal skincare",
  eyebrow: "Aloyri",
  body: "Find what suits your routine.",
  ctaLabel: "Shop now",
  ctaHref: "/shop",
  imagePath: "",
  items: [],
  align: "center",
  tone: "rose",
  spacing: "regular",
  hideMobile: false,
  hideDesktop: false,
};

test("visual builder keeps every commerce section and inserts custom blocks at requested positions", () => {
  const layout = normalizeVisualLayout({
    order: ["core:hero", "custom:my-new-block", "core:products", "custom:my-new-block", "core:checkout"],
    blocks: [custom, custom, { ...custom, id: "other", kind: "script" }],
    hiddenCore: ["categories", "categories", "nonexistent", "checkout"],
  });
  expect(layout.order.slice(0, 3)).toEqual(["core:hero", "custom:my-new-block", "core:products"]);
  expect(layout.blocks).toHaveLength(1);
  expect(layout.order).toHaveLength(defaultVisualOrder.length + 1);
  expect(new Set(layout.order).size).toBe(layout.order.length);
  expect(layout.hiddenCore).toEqual(["categories"]);
  expect(layout.order).toContain(coreBlockId("brandStory"));
});

test("legacy homepage section rearrangement keeps custom block anchored to its section", () => {
  const first = normalizeVisualLayout({ blocks: [custom], order: ["core:hero", "custom:my-new-block", "core:products"] });
  const reordered = reorderVisualCoreSections(first, ["products", "hero", "categories"]);
  expect(reordered.order.indexOf("custom:my-new-block")).toBe(reordered.order.indexOf("core:hero") + 1);
  expect(reordered.order.indexOf("core:products")).toBeLessThan(reordered.order.indexOf("core:hero"));
});

test("visual builder enforces media path, link, component and text limits", () => {
  expect(safeBuilderHref("javascript:alert(1)")).toBe("");
  expect(safeBuilderHref("//example.com")).toBe("");
  expect(safeBuilderHref("https://example.com")).toBe("");
  expect(safeBuilderHref("/shop?category=sunscreen")).toBe("/shop?category=sunscreen");
  const block = normalizeVisualBlock({ ...custom, title: "a".repeat(500), imagePath: "media/../../secrets.webp", ctaHref: "javascript:evil()", items: Array(20).fill("x".repeat(600)), tone: "unsafe", kind: "image" });
  expect(block?.title).toHaveLength(180);
  expect(block?.imagePath).toBe("");
  expect(block?.ctaHref).toBe("");
  expect(block?.items).toHaveLength(8);
  expect(block?.items[0]).toHaveLength(250);
  expect(block?.tone).toBe("light");
  expect(normalizeVisualBlock({ ...custom, kind: "html" })).toBeNull();
  expect(normalizeVisualBlock({ ...custom, id: "../malicious" })).toBeNull();
  expect(normalizeVisualLayout(null).order).toEqual(defaultVisualOrder);
});

test("page templates accept custom components without replacing operational sections", () => {
  const page = normalizeVisualPageLayout({
    order: ["core:hero", "custom:my-new-block", "core:products"],
    blocks: [custom],
    hiddenCore: ["products"],
  });
  expect(page.order).toEqual(["custom:my-new-block"]);
  expect(page.blocks[0].title).toBe("Seasonal skincare");
  expect(page.hiddenCore).toEqual([]);
  expect(normalizeVisualPageLayout(null).order).toEqual([]);
});

test("visual builder admin page requires authenticated permission", async ({ page }) => {
  await page.goto("/admin/builder");
  await expect(page).not.toHaveURL(/\/admin\/builder$/);
});

test("visual builder release preserves customer store entry points", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("search", { name: "Search skincare products" })).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("navigation", { name: "Account shortcuts" }).getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
  await expect(page.getByRole("button", { name: /^Cart(?: with .*)?$/ }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
