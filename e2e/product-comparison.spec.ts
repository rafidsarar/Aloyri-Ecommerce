import { expect, test, type Page } from "@playwright/test";

const products = [
  { id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 12, bestFor: "Gentle cleansing" },
  { id: "skin-aqua", name: "Skin Aqua Super Moisture UV Gel", brand: "Rohto", size: "110g", category: "Sunscreen", price: 1350, active: true, availableStock: 7, bestFor: "Daily sun care" },
  { id: "daily-serum", name: "Daily Hydrating Serum", brand: "Aloyri", size: "30ml", category: "Serum", price: 990, active: true, availableStock: 0, bestFor: "Dry skin" },
  { id: "other-cream", name: "Soft Face Cream", brand: "Aloyri", size: "50ml", category: "Moisturizer", price: 1050, active: true, availableStock: 5 },
];

async function mockCatalog(page: Page) {
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products, generatedAt: new Date().toISOString() }),
  }));
  await page.route("**/_next/image?**", route => route.fulfill({
    status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
  }));
}

test("shop compare buttons open a persistent live-catalog comparison without an account", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/shop");
  const cleanser = page.getByRole("button", { name: "Compare Refreshing Facial Wash" });
  await expect(cleanser).toBeEnabled();
  await cleanser.click();
  await expect(page.locator(".store-product-card .compare-toggle").filter({ hasText: "Selected" }).first()).toHaveAttribute("aria-pressed", "true");
  const tray = page.getByRole("complementary", { name: "Product comparison selection" });
  await expect(tray).toContainText("1/3");
  await tray.getByRole("link", { name: /Compare now/ }).click();
  await expect(page).toHaveURL(/\/compare$/);
  const region = page.getByRole("region", { name: "Scrollable product comparison table" });
  await expect(region.getByRole("columnheader", { name: /Refreshing Facial Wash/ })).toBeVisible();
  await expect(region).toContainText("Gentle cleansing");
  await expect(region).toContainText("In stock");
  await expect(page.getByRole("searchbox", { name: "Find a product to compare" })).toBeEnabled();
  await page.getByRole("searchbox", { name: "Find a product to compare" }).fill("sun");
  await page.getByRole("button", { name: "Add Skin Aqua Super Moisture UV Gel to comparison" }).click();
  await expect(region.getByRole("columnheader", { name: /Skin Aqua Super Moisture UV Gel/ })).toBeVisible();
  await expect(region).toContainText("Daily sun care");
  await expect(page.getByRole("heading", { name: /Choose products/ })).toContainText("2 of 3");
});

test("comparison limits selections, removes items and remains changeable", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/compare");
  for (const name of ["Refreshing Facial Wash", "Skin Aqua Super Moisture UV Gel", "Daily Hydrating Serum"]) {
    await page.getByRole("button", { name: "Add " + name + " to comparison" }).click();
  }
  await expect(page.getByRole("searchbox", { name: "Find a product to compare" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Scrollable product comparison table" })).toContainText("Out of stock");
  await page.getByRole("button", { name: "Remove Daily Hydrating Serum from comparison" }).click();
  await page.getByRole("searchbox", { name: "Find a product to compare" }).fill("face cream");
  await page.getByRole("button", { name: "Add Soft Face Cream to comparison" }).click();
  await expect(page.getByRole("region", { name: "Scrollable product comparison table" })).toContainText("Soft Face Cream");
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByText("Your comparison starts here.")).toBeVisible();
});

test("mobile comparison keeps document inside viewport and allows horizontal comparison scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCatalog(page);
  await page.goto("/shop");
  await page.getByRole("button", { name: "Compare Refreshing Facial Wash" }).click();
  await expect(page.getByRole("complementary", { name: "Product comparison selection" }).getByRole("link", { name: /Compare now/ })).toBeVisible();
  await page.getByRole("complementary", { name: "Product comparison selection" }).getByRole("link", { name: /Compare now/ }).click();
  await page.getByRole("button", { name: "Add Skin Aqua Super Moisture UV Gel to comparison" }).click();
  const region = page.getByRole("region", { name: "Scrollable product comparison table" });
  await expect(region).toBeVisible();
  expect(await region.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
