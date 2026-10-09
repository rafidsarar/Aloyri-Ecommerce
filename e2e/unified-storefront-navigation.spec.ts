import { expect, test } from "@playwright/test";

async function mockCatalog(page: import("@playwright/test").Page) {
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      generatedAt: new Date().toISOString(),
      categories: ["Cleanser", "Serum", "Lip care"],
      products: [{
        id: "crm-wash", name: "Everyday Wash", brand: "Aloyri", size: "150ml",
        category: "Cleanser", price: 550, active: true, availableStock: 3,
      }],
    }),
  }));
}

for (const viewport of [390, 1060, 1440] as const) {
  test(`unified two-line navigation works at ${viewport}px without middle desktop links`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 900 });
    await mockCatalog(page);
    await page.goto("/");

    const header = page.locator("header.store-header");
    const menu = header.getByRole("button", { name: "Open menu" });
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(header.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Search products" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Cart" })).toBeVisible();

    // The logo is centered in the real document, not centered between uneven
    // navigation links. Builder previews use the same header component.
    const brandCenter = await header.getByRole("link", { name: "Aloyri home" }).evaluate(
      el => { const box = el.getBoundingClientRect(); return box.left + box.width / 2; },
    );
    expect(Math.abs(brandCenter - viewport / 2)).toBeLessThan(5);

    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    const nav = drawer.getByRole("navigation", { name: "Primary navigation" });
    await expect(nav.getByRole("link", { name: "Explore skincare" })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Bestsellers/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Routine finder/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Customer care/i })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Serum", exact: true })).toHaveAttribute("href", "/category/serum");
    await expect(drawer.getByRole("link", { name: "My account" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Track order" })).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("desktop drawer closes by backdrop and still navigates to existing shopping pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCatalog(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Close navigation backdrop" }).click({ position: { x: 800, y: 100 } });
  await expect(page.getByRole("dialog", { name: "Navigation menu" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog", { name: "Navigation menu" })
    .getByRole("link", { name: "Search skincare and brands" }).click();
  await expect(page).toHaveURL(/\/shop/);
  await expect(page.getByRole("dialog", { name: "Navigation menu" })).toHaveCount(0);
});
