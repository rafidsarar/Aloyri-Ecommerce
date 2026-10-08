import { expect, test } from "@playwright/test";
import { defaultHomepageOrder, normalizeHomepageOrder, safeHomepageImagePath } from "../src/lib/homepage-builder";

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
  await expect(page.getByRole("search", { name: "Search skincare products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Customer account and sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cart/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation menu" }).getByRole("link", { name: "Track order" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("homepage editor requires admin login", async ({ page }) => {
  await page.goto("/admin/homepage");
  await expect(page).not.toHaveURL(/\/admin\/homepage$/);
});
