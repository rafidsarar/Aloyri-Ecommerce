import { test, expect } from "@playwright/test";
import { sellingProducts } from "../src/lib/homepage-selling-products";
import type { Product, LiveCatalogProduct } from "../src/lib/catalog";

test("full assortment selection is not restricted to bestsellers or maxProducts", () => {
  const products = Array.from({ length: 18 }, (_, i) => ({
    id: "product-" + i,
    active: i !== 16,
    availableStock: i === 17 ? 0 : 6,
    bestseller: i === 0,
  })) as unknown as Product[];
  expect(sellingProducts(products).map((product) => product.id)).toEqual(
    products.slice(0, 16).map((product) => product.id),
  );
  expect(sellingProducts([products[0], products[0], products[1]])).toHaveLength(2);
});

const sampleProducts: LiveCatalogProduct[] = Array.from({ length: 17 }, (_, i) => ({
  id: "homepage-scroll-test-" + i,
  name: "Skincare Test Product " + (i + 1),
  brand: "Aloyri Test",
  size: "50ml",
  category: "Cleanser",
  price: 500 + i * 10,
  active: true,
  availableStock: 5,
  bestseller: i === 0,
}));

async function mockCatalog(page: import("@playwright/test").Page) {
  await page.route("**/api/catalog", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: sampleProducts, categories: ["Cleanser"], generatedAt: "2026-10-15T00:00:00Z" }),
    });
  });
}

test("all 17 available products scroll automatically and remain manually browsable on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockCatalog(page);
  await page.goto("/");
  const region = page.getByRole("region", { name: "All available skincare products" });
  await expect(region).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore every skincare essential." })).toBeVisible();
  const track = region.locator(".home-selling-carousel-track");
  await expect(track.locator(".home-selling-carousel-item")).toHaveCount(17);
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect.poll(() => track.evaluate((node) => node.scrollLeft), { timeout: 10_000 }).toBeGreaterThan(5);

  await region.getByRole("button", { name: "Pause automatic product scrolling" }).click();
  await expect(region.getByRole("button", { name: "Resume automatic product scrolling" })).toBeVisible();
  const pausedOffset = await track.evaluate((node) => node.scrollLeft);
  await page.waitForTimeout(350);
  expect(Math.abs((await track.evaluate((node) => node.scrollLeft)) - pausedOffset)).toBeLessThan(2);

  const before = await track.evaluate((node) => node.scrollLeft);
  await region.getByRole("button", { name: "Next products" }).click();
  await expect.poll(() => track.evaluate((node) => node.scrollLeft)).toBeGreaterThan(before + 30);
  await region.getByRole("button", { name: "Resume automatic product scrolling" }).click();
  await expect(region.getByRole("button", { name: "Pause automatic product scrolling" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reduced-motion visitors can browse the complete carousel on mobile without autoplay", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockCatalog(page);
  await page.goto("/");
  const region = page.getByRole("region", { name: "All available skincare products" });
  const track = region.locator(".home-selling-carousel-track");
  await expect(track.locator(".home-selling-carousel-item")).toHaveCount(17);
  await track.scrollIntoViewIfNeeded();
  await expect(region.getByRole("button", { name: "Automatic scrolling disabled by reduced-motion preference" })).toBeDisabled();
  await page.waitForTimeout(450);
  expect(await track.evaluate((node) => node.scrollLeft)).toBe(0);
  await region.getByRole("button", { name: "Next products" }).click();
  await expect.poll(() => track.evaluate((node) => node.scrollLeft)).toBeGreaterThan(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
