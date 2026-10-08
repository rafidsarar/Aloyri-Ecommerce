import { expect, test, type Page } from "@playwright/test";

const inventory = [
  { id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 2 },
  { id: "skin-aqua", name: "Skin Aqua Super Moisture UV Gel", brand: "Rohto", size: "110g", category: "Sunscreen", price: 1350, active: true, availableStock: 5 },
];

async function mockStore(page: Page) {
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products: inventory, generatedAt: new Date().toISOString() }),
  }));
  await page.route("**/api/store-status", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ orderingEnabled: true, paymentMethods: ["COD"], deliveryRates: { "inside-dhaka": 80, "outside-dhaka": 150 } }),
  }));
  await page.route("**/_next/image?**", route => route.fulfill({
    status: 200, contentType: "image/svg+xml",
    body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
  }));
}

test("320px header exposes direct search, account and cart without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await mockStore(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Search products" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Customer account and sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Search products" }).click();
  await expect(page).toHaveURL(/\/shop/);
});

test("keyboard-accessible search suggestions navigate and clear cleanly", async ({ page }) => {
  await mockStore(page);
  await page.goto("/shop");
  const search = page.getByPlaceholder("Search products, brands, routines or textures");
  await search.fill("Refreshing");
  await expect(page.getByRole("listbox", { name: "Search suggestions" })).toBeVisible();
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", "storefront-search-option-0");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/product\/simple-wash/);
  await page.goto("/shop");
  await search.fill("Skin Aqua");
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("button", { name: "Clear search" })).toHaveCount(0);
});

test("mobile product buy now preserves guest sign-in and creates a single cart item", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await mockStore(page);
  await page.goto("/shop");
  await page.getByRole("link", { name: /Refreshing Facial Wash/i }).first().click();
  await expect(page.getByRole("heading", { name: "Refreshing Facial Wash" })).toBeVisible();
  const mobileBar = page.locator(".fixed").filter({ has: page.getByRole("button", { name: "Buy now" }) });
  await expect(mobileBar.getByRole("button", { name: "Buy now" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mobileBar.getByRole("button", { name: "Buy now" }).click();
  await expect(page).toHaveURL(/\/account\/setup\?next=/);
  await expect(page.getByRole("link", { name: "Cart with 1 item" })).toBeVisible();
});

test("cart estimates delivery from live store rates without submitting an order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockStore(page);
  await page.goto("/shop");
  await page.getByRole("button", { name: "Add Refreshing Facial Wash to cart" }).click();
  await page.getByRole("link", { name: "Cart with 1 item" }).click();
  const estimate = page.getByRole("region", { name: "Estimated delivery charge" });
  await expect(estimate.getByRole("button", { name: /Inside Dhaka/ })).toBeVisible();
  await estimate.getByRole("button", { name: /Inside Dhaka/ }).click();
  await expect(estimate.getByRole("status")).toContainText("829");
  await estimate.getByRole("button", { name: /Outside Dhaka/ }).click();
  await expect(estimate.getByRole("status")).toContainText("899");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
