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

test("category panel fits, closes on selection, and highlights the selected route", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Shop and discover" });
  await nav.locator("summary").click();
  const box = await nav.locator(".store-mega-panel").boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1024);
  await nav.getByRole("link", { name: "Cleanser", exact: true }).click();
  await expect(page).toHaveURL(/\/category\/cleanser/);
  await expect(nav.locator("details")).not.toHaveAttribute("open", "");
  await nav.locator("summary").click();
  await expect(nav.getByRole("link", { name: "Cleanser", exact: true })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(nav.locator("summary")).toBeFocused();
  await page.goto("/shop?sort=bestseller");
  await expect(nav.getByRole("link", { name: "Bestsellers", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Shop", exact: true })).not.toHaveAttribute("aria-current", "page");
});

for (const width of [390, 1440]) {
  test(`sticky header compacts and restores at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.goto("/");
    const header = page.locator(".store-header");
    const initial = (await header.boundingBox())!.height;
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(header).toHaveAttribute("data-compact", "true");
    await expect.poll(async () => (await header.boundingBox())!.height).toBeLessThan(initial);
    expect((await header.boundingBox())!.y).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).toHaveAttribute("data-compact", "false");
  });
}
