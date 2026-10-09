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

test("homepage offers CRM-backed quick search, accessible suggestions and native shop navigation", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const search = page.getByRole("search", { name: "Search skincare products" });
  await expect(search).toBeVisible();
  const box = search.getByRole("combobox");
  await box.fill("Skin Aqua");
  await expect(page.getByRole("listbox", { name: "Suggested skincare products" }))
    .toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("listbox").getByRole("option", { name: /Skin Aqua Super Moisture UV Gel/ }))
    .toHaveAttribute("href", /\/product\/.*skin-aqua-super-moisture-uv-gel$/);
  await box.press("Escape");
  await expect(page.getByRole("listbox", { name: "Suggested skincare products" })).toHaveCount(0);
  await search.getByRole("button", { name: "Search" }).click();
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

  await page.getByText(/Filter by brand, availability & price/).click();
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
  await expect(page.getByRole("combobox", { name: "Search skincare" })).toHaveValue("");
  await expect(page).not.toHaveURL(/q=unlikelysearchphrase/);
});

for (const width of [320, 390, 768, 1440]) {
  test(`discovery controls remain within viewport at ${width}px`, async ({ page }) => {
    await mockCatalog(page);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("search", { name: "Search skincare products" })).toBeVisible();
    const gallery = page.getByLabel("Browse CRM skincare categories");
    await expect(gallery).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto("/shop");
    await expect(page.getByRole("navigation", { name: "Shop categories" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}


test("homepage search dropdown offers categories, featured discovery and session-only recent searches", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  const input = page.getByRole("search", { name: "Search skincare products" }).getByRole("combobox");
  await input.focus();
  const dropdown = page.getByRole("listbox", { name: "Suggested skincare products" });
  await expect(dropdown).toBeVisible();
  await expect(dropdown.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  await dropdown.getByRole("tab", { name: "Categories" }).click();
  await expect(dropdown.getByRole("link", { name: /Sunscreen/ })).toBeVisible();
  await dropdown.getByRole("tab", { name: "Products" }).click();
  await input.fill("Skin Aqua");
  await expect(dropdown.getByRole("option", { name: /Skin Aqua Super Moisture UV Gel/ })).toBeVisible();
  await page.getByRole("search", { name: "Search skincare products" }).getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/shop\?q=Skin(\+|%20)Aqua/);
  await page.goto("/");
  await input.focus();
  await expect(dropdown.getByRole("button", { name: "Skin Aqua" })).toBeVisible();
  await dropdown.getByRole("button", { name: "Clear" }).click();
  await expect(dropdown.getByRole("button", { name: "Skin Aqua" })).toHaveCount(0);
});


test("shop search matches focused overlay reference while retaining CRM-backed discovery", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/shop");
  const input = page.getByRole("combobox", { name: "Search skincare" });
  await expect(input).toBeVisible();
  await input.focus();
  const overlay = page.getByRole("dialog", { name: "Search discovery" });
  await expect(overlay).toBeVisible();
  await expect(page.getByRole("button", { name: "Close search overlay" })).toBeVisible();
  await overlay.getByRole("tab", { name: "Categories" }).click();
  await expect(overlay.getByRole("button", { name: "Sunscreen" })).toBeVisible();
  await overlay.getByRole("tab", { name: "Products" }).click();
  await input.fill("Skin Aqua");
  await expect(overlay.getByRole("option", { name: /Skin Aqua Super Moisture UV Gel/ })).toBeVisible();
  await page.screenshot({ path: "test-results/shop-search-desktop.png" });
  await input.press("Enter");
  await expect(overlay).toHaveCount(0);
  await expect(page).toHaveURL(/q=Skin(\+|%20)Aqua/);
  await page.getByRole("link", { name: "Search products" }).click();
  await expect(overlay).toBeVisible();
  await page.getByRole("button", { name: "Close search" }).click();
  await expect(overlay).toHaveCount(0);
});

test("mobile hamburger search opens the same minimal shop overlay", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Store navigation menu" });
  await menu.getByRole("link", { name: "Search products and brands" }).click();
  const overlay = page.getByRole("dialog", { name: "Search discovery" });
  await expect(overlay).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search skincare" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/shop-search-mobile.png" });
  await page.getByRole("button", { name: "Close search overlay" }).click();
  await expect(overlay).toHaveCount(0);
});

test("header search from other pages opens shop discovery after CRM loads", async ({ page }) => {
  await mockCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: "Search products" }).click();
  await expect(page).toHaveURL(/\/shop/);
  await expect(page.getByRole("dialog", { name: "Search discovery" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search skincare" })).toBeFocused();
});
