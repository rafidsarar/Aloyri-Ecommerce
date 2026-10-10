import { expect, test } from "@playwright/test";

const catalog = {
  generatedAt: "2026-10-10T00:00:00.000Z",
  categories: ["Cleanser", "Moisturizer", "Lip care"],
  products: [{ id: "test-cleanser", name: "Daily Cleanser", brand: "Aloyri",
    category: "Cleanser", size: "100ml", price: 400, active: true, availableStock: 6 }],
};

test("desktop category mega-menu follows the live catalog without replacing floating search", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Shop and discover" });
  await expect(nav).toBeVisible();
  await nav.locator("summary").click();
  await expect(nav.getByRole("link", { name: "Lip care" })).toHaveAttribute("href", "/category/lip-care");
  await page.keyboard.press("Escape");
  await expect(nav.getByRole("link", { name: "Lip care" })).not.toBeVisible();
  await page.locator(".store-header").getByRole("button", { name: "Search products" }).click();
  await expect(page.getByRole("dialog", { name: "Search discovery" })).toBeVisible();
});

test("homepage merchandising does not introduce mobile horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Shop and discover" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
