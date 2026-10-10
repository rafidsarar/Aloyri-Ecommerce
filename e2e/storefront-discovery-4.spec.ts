import { expect, test, type Page } from "@playwright/test";

const catalog = {
  generatedAt: "2026-10-09T00:00:00.000Z",
  categories: ["Cleanser", "Sunscreen", "Lip care", "Body care"],
  products: [
    { id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 12 },
    { id: "skin-aqua", name: "Skin Aqua Super Moisture UV Gel", brand: "Rohto", size: "110g", category: "Sunscreen", price: 1350, active: true, availableStock: 7 },
  ],
};

async function mockCatalog(page: Page) {
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify(catalog),
  }));
  await page.route("**/_next/image?**", route => route.fulfill({
    status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
  }));
}

test("homepage opens CRM-backed floating search without navigating until a result is chosen", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // Inline homepage search is intentionally absent; the global header search remains.
  await expect(page.getByRole("search", { name: "Search skincare products" })).toHaveCount(0);
  const homeSearch = page.locator(".store-header").getByRole("button", { name: "Search products" });
  await expect(homeSearch).toBeVisible();
  await homeSearch.click();
  const modal = page.getByRole("dialog", { name: "Search discovery" });
  await expect(modal).toBeVisible();
  await expect(page).toHaveURL("/");
  const input = modal.getByRole("combobox", { name: "Search skincare" });
  await expect(input).toBeFocused();
  await input.fill("Skin Aqua");
  await expect(modal.getByRole("listbox", { name: "Search suggestions" }).getByRole("option", { name: /Skin Aqua Super Moisture UV Gel/ }))
    .toHaveAttribute("href", /\/product\/.*skin-aqua-super-moisture-uv-gel$/);
  await expect(page).toHaveURL("/");
  await input.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await homeSearch.click();
  await modal.getByRole("combobox", { name: "Search skincare" }).fill("Skin Aqua");
  await modal.getByRole("button", { name: /View all results for/ }).click();
  await expect(page).toHaveURL(/\/shop\?q=Skin(\+|%20)Aqua/);
  await expect(page.getByRole("heading", { name: "Shop skincare." })).toBeVisible();
});

test("new CRM categories appear as shop chips, can be removed, and preserve URL state", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/shop");
  const categories = page.getByRole("navigation", { name: "Shop categories" });
  await expect(categories.getByRole("button", { name: /Lip care/ })).toBeVisible({ timeout: 15_000 });
  await categories.getByRole("button", { name: /Lip care/ }).click();
  await expect(page).toHaveURL(/category=Lip(%20|\+)care/);
  await expect(page.getByRole("button", { name: "Remove category: Lip care" })).toBeVisible();
  await page.getByRole("button", { name: "Remove category: Lip care" }).click();
  await expect(categories.getByRole("button", { name: "All skincare" })).toHaveAttribute("aria-pressed", "true");

  await page.getByText(/^Filters/).click();
  await page.getByLabel("Brand", { exact: true }).selectOption("Simple");
  await expect(page.getByRole("button", { name: "Remove brand: Simple" })).toBeVisible();
  await page.getByRole("button", { name: "Remove brand: Simple" }).click();
  await expect(page.getByLabel("Brand", { exact: true })).toHaveValue("All");
});

test("zero-results state resets query and filters without leaving CRM-safe shop", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/shop?q=unlikelysearchphrase");
  await expect(page.getByText("Nothing matched that search.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Show all skincare" }).click();
  await expect(page.getByRole("status", { name: "" })).toContainText("2 products");
  await expect(page.getByRole("combobox", { name: "Search skincare" })).toHaveCount(0);
  await expect(page).not.toHaveURL(/q=unlikelysearchphrase/);
});

for (const width of [320, 390, 768, 1440]) {
  test(`discovery controls remain within viewport at ${width}px`, async ({ page }) => {
    await mockCatalog(page);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.locator(".store-header").getByRole("button", { name: "Search products" })).toBeVisible();
    const gallery = page.getByLabel("Browse CRM skincare categories");
    await expect(gallery).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto("/shop");
    await expect(page.getByRole("navigation", { name: "Shop categories" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}


test("floating search retains categories, product suggestions and session-only recent searches", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await page.locator(".store-header").getByRole("button", { name: "Search products" }).click();
  const modal = page.getByRole("dialog", { name: "Search discovery" });
  const input = modal.getByRole("combobox", { name: "Search skincare" });
  await expect(modal.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  await modal.getByRole("tab", { name: "Categories" }).click();
  await expect(modal.getByRole("link", { name: /Sunscreen/ })).toBeVisible();
  await modal.getByRole("tab", { name: "Products" }).click();
  await input.fill("Skin Aqua");
  await expect(modal.getByRole("option", { name: /Skin Aqua Super Moisture UV Gel/ })).toBeVisible();
  await expect(page).toHaveURL("/");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/shop\?q=Skin(\+|%20)Aqua/);
  await page.goto("/");
  await page.getByRole("button", { name: "Search products", exact: true }).click();
  await expect(modal.getByRole("button", { name: "Skin Aqua" })).toBeVisible();
  await modal.getByRole("button", { name: "Clear history" }).click();
  await expect(modal.getByRole("button", { name: "Skin Aqua" })).toHaveCount(0);
});

test("shop opens floating search without losing the product-focused page", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shop");
  await expect(page.getByRole("combobox", { name: "Search skincare" })).toHaveCount(0);
  await page.getByRole("button", { name: "Search products", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Search discovery" });
  await expect(modal).toBeVisible();
  await expect(page).toHaveURL("/shop");
  await expect(page.getByRole("button", { name: "Close search overlay" })).toBeVisible();
  await modal.getByRole("tab", { name: "Categories" }).click();
  await expect(modal.getByRole("link", { name: /Sunscreen/ })).toBeVisible();
  await modal.getByRole("tab", { name: "Products" }).click();
  const input = modal.getByRole("combobox", { name: "Search skincare" });
  await input.fill("Skin Aqua");
  await expect(modal.getByRole("option", { name: /Skin Aqua Super Moisture UV Gel/ })).toBeVisible();
  await expect(page).toHaveURL("/shop");
  await page.screenshot({ path: "test-results/shop-search-desktop.png" });
  await input.press("Enter");
  await expect(modal).toHaveCount(0);
  await expect(page).toHaveURL(/q=Skin(\+|%20)Aqua/);
  await page.getByRole("button", { name: "Search products", exact: true }).click();
  await expect(modal).toBeVisible();
  await page.getByRole("button", { name: "Close search", exact: true }).click();
  await expect(modal).toHaveCount(0);
});

test("mobile search opens from header while hamburger stays navigation-only", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop");
  await expect(page.getByRole("combobox", { name: "Search skincare" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Store navigation menu" });
  await expect(menu.getByRole("button", { name: "Search products and brands" })).toHaveCount(0);
  await menu.getByRole("button", { name: "Close menu" }).click();
  await page.getByRole("button", { name: "Search products", exact: true }).click();
  const overlay = page.getByRole("dialog", { name: "Search discovery" });
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole("combobox", { name: "Search skincare" })).toBeFocused();
  await expect(page).toHaveURL("/shop");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/shop-search-mobile.png" });
  await page.getByRole("button", { name: "Close search", exact: true }).click();
  await expect(overlay).toHaveCount(0);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog", { name: "Store navigation menu" }).getByRole("button", { name: "Close menu" }).click();
  await page.getByRole("button", { name: "Search products", exact: true }).click();
  await expect(overlay).toBeVisible();
});

test("header search stays on the current page across storefront routes", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["/", "/shop", "/cart", "/track-order"]) {
    await page.goto(route);
    await page.getByRole("button", { name: "Search products", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Search discovery" });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("combobox", { name: "Search skincare" })).toBeFocused();
    await expect(page).toHaveURL(route);
    await modal.getByRole("combobox", { name: "Search skincare" }).fill("Skin Aqua");
    await expect(modal.getByRole("option", { name: /Skin Aqua Super Moisture UV Gel/ })).toBeVisible();
    await expect(page).toHaveURL(route);
    await modal.getByRole("button", { name: "Close search" }).click();
    await expect(modal).toHaveCount(0);
  }
});

test("shop prioritizes the catalog above the fold and tucks away advanced filters", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Shop skincare." })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search skincare" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Shop categories" })).toBeVisible();
  const firstProduct = page.getByRole("link", { name: /Refreshing Facial Wash/ }).first();
  await expect(firstProduct).toBeVisible();
  const bounds = await firstProduct.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeLessThan(900);
  const filters = page.locator("details").filter({has: page.locator("summary").getByText("Filters", { exact: true })});
  await expect(filters).not.toHaveAttribute("open", "");
  await filters.locator("summary").click();
  await expect(page.getByRole("navigation", { name: "Shop by product focus" })).toBeVisible();
  await page.getByLabel("Brand", { exact: true }).selectOption("Simple");
  await expect(page.getByRole("button", { name: "Remove brand: Simple" })).toBeVisible();
});
