import { expect, test, type Page } from "@playwright/test";

const catalog = {
  generatedAt: "2026-10-13T00:00:00.000Z",
  categories: ["Cleanser"],
  products: [{
    id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple",
    size: "150ml", category: "Cleanser", price: 749,
    description: "A gentle daily facial wash.", texture: "Gel",
    routineStep: "Cleanse", bestFor: "Everyday cleansing",
    active: true, availableStock: 12,
  }],
};

async function mockCatalog(page: Page) {
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
  await page.route("**/_next/image?**", route => route.fulfill({
    status: 200, contentType: "image/svg+xml",
    body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
  }));
}

test("product detail has an editorial hero and retains live purchase controls", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/shop");
  await expect(page.locator(".kanva-shop-page .kanva-page-heading")).toBeVisible();
  await page.getByRole("link", { name: /Refreshing Facial Wash/i }).first().click();
  await expect(page.locator(".kanva-product-hero")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Refreshing Facial Wash" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Care that fits your rhythm/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Product information" })).toBeVisible();
  await expect(page.locator(".kanva-product-price").getByText(/749/)).toBeVisible();
  await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await page.getByRole("button", { name: /^Cart with 1 item$/ }).click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" }).getByText("Refreshing Facial Wash", { exact: true })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`editorial product detail and shop do not overflow at ${width}px`, async ({ page }) => {
    await mockCatalog(page);
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/shop");
    await expect(page.locator(".kanva-shop-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: /Refreshing Facial Wash/i }).first().click();
    await expect(page.locator(".kanva-product-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".kanva-product-chapter").scrollIntoViewIfNeeded();
    await expect(page.locator(".kanva-product-chapter")).toBeVisible();
  });
}

test("reduced-motion visitors can read every product section without animation", async ({ page }) => {
  await mockCatalog(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shop");
  await page.getByRole("link", { name: /Refreshing Facial Wash/i }).first().click();
  await expect(page.getByRole("heading", { name: /Care that fits your rhythm/i })).toBeVisible();
  await expect(page.locator(".kanva-product-chapter")).toHaveCSS("opacity", "1");
});
