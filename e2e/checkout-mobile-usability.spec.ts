import { expect, test, type Page } from "@playwright/test";

const inventory = [
  { id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 6 },
  { id: "skin-aqua", name: "Skin Aqua Super Moisture UV Gel", brand: "Rohto", size: "110g", category: "Sunscreen", price: 1350, active: true, availableStock: 7 },
];

async function mockLiveCatalog(page: Page) {
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products: inventory, generatedAt: new Date().toISOString() }),
  }));
  await page.route("**/_next/image?**", route => route.fulfill({
    status: 200, contentType: "image/svg+xml",
    body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
  }));
}

async function addProductAndOpenCart(page: Page) {
  await page.goto("/shop");
  await page.getByRole("button", { name: "Add Refreshing Facial Wash to cart" }).click();
  await page.getByRole("link", { name: "Cart with 1 item" }).click();
  await expect(page.getByRole("heading", { name: "Cart." })).toBeVisible();
}

test("320px mobile cart keeps prices and action inside viewport", async ({ page }) => {
  await mockLiveCatalog(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await addProductAndOpenCart(page);

  const mobileAction = page.locator(".checkout-mobile-bar");
  await expect(mobileAction.getByRole("link", { name: /Checkout/i })).toBeVisible();
  await expect(mobileAction).toContainText("shipping next");
  await expect(page.getByRole("button", { name: "Decrease Refreshing Facial Wash quantity" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole("button", { name: "Increase Refreshing Facial Wash quantity" }).click();
  await expect(page.getByRole("link", { name: "Cart with 2 items" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mobileAction.getByRole("link", { name: /Checkout/i }).click();
  await expect(page).toHaveURL(/\/account\/setup\?next=(?:%2F|\/)checkout/);
});

test("390px mobile cart allows accessible removal and preserves guest privacy", async ({ page }) => {
  await mockLiveCatalog(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await addProductAndOpenCart(page);
  await page.getByRole("button", { name: "Remove Refreshing Facial Wash from cart" }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("aloyri_")))).toEqual([]);
});

test("narrow mobile navigation keeps search and account accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Customer account and sign in" })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(drawer.getByRole("link", { name: "Search skincare and brands" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Track order" })).toBeVisible();
  await drawer.getByRole("link", { name: "Search skincare and brands" }).click();
  await expect(page).toHaveURL(/\/shop/);
  await expect(page.getByRole("dialog", { name: "Navigation menu" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("tablet cart has no fixed mobile action overlap at desktop breakpoint", async ({ page }) => {
  await mockLiveCatalog(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await addProductAndOpenCart(page);
  await expect(page.locator(".checkout-mobile-bar")).toBeHidden();
  await expect(page.getByRole("link", { name: "Continue to checkout" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe("checkout and cart mobile usability", () => {
  for (const width of [320, 375, 390, 768]) {
    test(`guest checkout preserves authentication and fits ${width}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/checkout");
      await expect(page).toHaveURL(/\/account\/setup\?next=/);
      await expect(page.getByRole("link", { name: "Sign in with Google" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test(`empty cart stays inside ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/cart");
      await expect(page.getByRole("heading", { name: "Cart." })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
