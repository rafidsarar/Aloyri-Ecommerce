import { expect, test } from "@playwright/test";

const catalog = {
  generatedAt: "2026-10-10T00:00:00.000Z",
  categories: ["Cleanser", "Moisturizer", "Lip care"],
  products: [{ id: "test-cleanser", name: "Daily Cleanser", brand: "Aloyri",
    category: "Cleanser", size: "100ml", price: 400, active: true, availableStock: 6 }],
};

test("hamburger category panel follows the live catalog without replacing floating search", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const nav = page.getByRole("dialog", { name: "Store navigation menu" });
  await expect(nav).toBeVisible();
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


for (const width of [390, 1440]) {
  test(`sticky header compacts and restores at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.goto("/");
    const header = page.locator(".store-header");
    await expect(header).toBeVisible();
    const initial = (await header.boundingBox())!.height;
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(header).toHaveAttribute("data-compact", "true");
    await expect.poll(async () => (await header.boundingBox())!.height).toBeLessThan(initial);
    expect((await header.boundingBox())!.y).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).toHaveAttribute("data-compact", "false");
  });
}

for (const width of [390, 1024, 1440]) {
  test(`unified drawer has unique destinations and active navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Shop and discover" })).toHaveCount(0);
    const opener = page.getByRole("button", { name: "Open menu" });
    await opener.click();
    const drawer = page.getByRole("dialog", { name: "Store navigation menu" });
    const destinations = await drawer.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')));
    expect(new Set(destinations).size).toBe(destinations.length);
    await expect(drawer.locator('a[href="/shop"]')).toHaveCount(1);
    await expect(drawer.getByRole('link', { name: 'Routine finder', exact: true })).toBeVisible();
    await drawer.getByRole('link', { name: 'Cleanser', exact: true }).click();
    await expect(page).toHaveURL(/\/category\/cleanser/);
    await expect(drawer).toHaveCount(0);
    await opener.click();
    await expect(drawer.getByRole('link', { name: 'Cleanser', exact: true })).toHaveAttribute('aria-current', 'page');
    await drawer.getByRole('link', { name: 'Bestsellers', exact: true }).click();
    await expect(page).toHaveURL(/sort=bestseller/);
    await opener.click();
    await expect(drawer.getByRole('link', { name: 'Bestsellers', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(drawer.locator('a[href="/shop"]')).not.toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
