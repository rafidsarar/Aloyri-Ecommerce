import { expect, test } from "@playwright/test";
import { defaultHomepageOrder, normalizeHomepageOrder, safeHomepageImagePath } from "../src/lib/homepage-builder";
import { normalizeHomepageHighlights } from "../src/lib/homepage-highlights";

test("homepage section order ignores unknown blocks and duplicate IDs", () => {
  const order = normalizeHomepageOrder(["brandStory", "hero", "hero", "checkout", null, "products"]);
  expect(order.slice(0, 3)).toEqual(["brandStory", "hero", "products"]);
  expect(order).toHaveLength(defaultHomepageOrder.length);
  expect(new Set(order).size).toBe(defaultHomepageOrder.length);
  expect(normalizeHomepageOrder(null)).toEqual(defaultHomepageOrder);
});

test("homepage media only accepts private library paths", () => {
  expect(safeHomepageImagePath("media/editorial/hero.webp")).toBe("media/editorial/hero.webp");
  for (const input of ["https://example.com/banner.jpg", "/admin", "media/../../secret.webp", "javascript:alert(1)", "media/file.svg"]) {
    expect(safeHomepageImagePath(input)).toBe("");
  }
});

test("customer storefront keeps search, categories, account, cart and order tracking", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("search", { name: "Search skincare products" })).toHaveCount(0);
  await expect(page.locator(".store-header").getByRole("button", { name: "Search products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
  const accountButton = page.getByRole("button", { name: "Account menu" });
  await expect(accountButton).toBeVisible();
  await accountButton.click();
  const accountMenu = page.getByRole("navigation", { name: "Account shortcuts" });
  await expect(accountMenu.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
  await expect(accountMenu.getByRole("link", { name: "Track order" })).toHaveAttribute("href", "/track-order");
  await page.keyboard.press("Escape");
  await expect(accountMenu).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Cart(?: with .*)?$/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Store navigation menu" }).getByRole("link", { name: "Track order" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("homepage editor requires admin login", async ({ page }) => {
  await page.goto("/admin/homepage");
  await expect(page).not.toHaveURL(/\/admin\/homepage$/);
});

test("homepage suppresses hard-coded generic selling points but preserves real admin highlights", () => {
  const generic = [
    "Curated selection",
    "BDT pricing",
    "Bangladesh-first storefront",
  ];
  expect(normalizeHomepageHighlights(generic)).toEqual([]);
  expect(normalizeHomepageHighlights(["", "  BDT PRICING  ", null])).toEqual([]);
  expect(normalizeHomepageHighlights(["Ships via a named courier", "Free shipping on orders above ৳1,500"])).toEqual([
    "Ships via a named courier",
    "Free shipping on orders above ৳1,500",
  ]);
  expect(normalizeHomepageHighlights(undefined)).toEqual([]);
});

test("default homepage has no placeholder benefits bar between hero and categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Bangladesh-first storefront")).toHaveCount(0);
  await expect(page.getByText("Curated selection")).toHaveCount(0);
  await expect(page.getByText("BDT pricing", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Why shop Aloyri" })).toHaveCount(0);
});
