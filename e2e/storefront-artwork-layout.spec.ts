import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`fallback media and long category labels stay contained at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const category = "ExtraLongUnbrokenCategoryNameForSensitiveSkin";
    await page.route("**/api/catalog", route => route.fulfill({ json: {
      generatedAt: new Date().toISOString(), categories: [category],
      products: [{ id: "layout-fallback", name: "Gentle daily wash", brand: "Long skincare brand name", category, size: "100ml", price: 500, active: true, availableStock: 8 }],
    } }));
    await page.goto("/shop");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Store navigation menu" });
    const link = drawer.getByRole("link", { name: category, exact: true });
    await expect(link).toBeVisible();
    const geometry = await link.evaluate(el => {
      const box = el.getBoundingClientRect();
      const thumbnail = el.querySelector('.product-artwork')!.getBoundingClientRect();
      const label = el.lastElementChild!.getBoundingClientRect();
      return { contained: el.scrollWidth <= el.clientWidth, separated: thumbnail.right <= label.left,
        labelFits: label.right <= box.right && label.bottom <= box.bottom };
    });
    expect(geometry).toEqual({ contained: true, separated: true, labelFits: true });
    expect(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("menu.png") });
    await drawer.getByRole("button", { name: "Close menu" }).click();
    await page.goto("/");
    for (const card of await page.locator('.store-category-visual').all()) {
      expect(await card.evaluate(el => {
        const heading = el.querySelector('h3')!.getBoundingClientRect();
        const media = el.querySelector('.store-category-media')!.getBoundingClientRect();
        const description = el.querySelector('.store-category-description')!.getBoundingClientRect();
        return heading.bottom <= media.top && media.bottom <= description.top;
      })).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true });
  });
}
