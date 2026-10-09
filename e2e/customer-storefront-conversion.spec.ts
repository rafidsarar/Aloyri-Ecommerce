import { expect, test, type Page } from "@playwright/test";

const fixtureProducts = [
  { id: "shop-ux-cleanser", name: "Gentle Facial Cleanser", brand: "Aloyri", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 12, description: "Gentle cleanser for daily use" },
  { id: "shop-ux-spf", name: "Everyday SPF 50 Sunscreen", brand: "Aloyri", size: "50ml", category: "Sunscreen", price: 1190, active: true, availableStock: 8, description: "Lightweight sunscreen" },
];

async function mockCatalog(page: Page) {
  await page.route("**/api/catalog", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: fixtureProducts, generatedAt: "2026-10-08T00:00:00.000Z" }),
    }),
  );
}

test.describe("customer storefront usability", () => {
  for (const width of [320, 375, 390, 768, 1280]) {
    test(`shop stays usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await mockCatalog(page);
      await page.goto("/shop");
      await expect(page.getByRole("combobox", { name: "Search skincare" })).toHaveCount(0);
      await expect(page.getByRole("combobox", { name: "Sort" })).toBeVisible();
      await expect(page.getByText("Filters", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /Gentle Facial Cleanser/i })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("mobile search and filters narrow the results", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockCatalog(page);
    await page.goto("/shop");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Store navigation menu" }).getByRole("link", { name: "Search products and brands" }).click();
    await page.getByRole("combobox", { name: "Search skincare" }).fill("sunscreen");
    await expect(page.getByRole("link", { name: /Everyday SPF 50 Sunscreen/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gentle Facial Cleanser/i })).toHaveCount(0);
    await page.getByRole("combobox", { name: "Search skincare" }).clear();
    await page.getByRole("button", { name: "Close search", exact: true }).click();
    await page.getByText("Filters", { exact: true }).click();
    await page.getByRole("combobox", { name: "Availability" }).selectOption("in-stock");
    await expect(page.getByText(/2 products/)).toBeVisible();
  });

  test("mobile empty cart offers a clear return to shopping without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await mockCatalog(page);
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Shop skincare" })).toHaveAttribute("href", "/shop");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("unsigned shoppers are routed to Google account setup before checkout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/account\/setup\?/);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/checkout");
    await expect(page.getByRole("link", { name: /sign in with google/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /place cod order/i })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("checkout without items does not expose an order submission action", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockCatalog(page);
    await page.goto("/checkout");
    await expect(page.getByRole("button", { name: "Review order" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("cart remains empty after navigating between checkout and cart", async ({ page }) => {
    await mockCatalog(page);
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await page.goto("/checkout");
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("mobile navigation and checkout entry are accessible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await page.goto("/cart");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/checkout");
    await expect(page.locator("main")).toBeVisible();
  });
});
