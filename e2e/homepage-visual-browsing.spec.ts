import { expect, test } from "@playwright/test";

test.describe("homepage visual shopping", () => {
  test("desktop shopper can browse visual categories and search products", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What are you looking for today?" })).toBeVisible();
    const categories = page.locator('[aria-labelledby="shop-by-category"]');
    await expect(categories.getByRole("link", { name: /Cleansers/ })).toHaveAttribute("href", "/category/cleansers");
    await expect(categories.getByRole("link", { name: /Moisturizers/ })).toHaveAttribute("href", "/category/moisturizers");
    await expect(categories.getByRole("link", { name: /Sunscreen/ })).toHaveAttribute("href", "/category/sunscreen");
    await page.getByRole("search", { name: "Search skincare products" }).getByRole("searchbox").fill("sunscreen");
    await page.getByRole("search", { name: "Search skincare products" }).getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/shop\?q=sunscreen/);
    await expect(page.getByRole("heading", { name: "Shop skincare." })).toBeVisible();
  });

  for (const width of [320, 390, 768, 1280]) {
    test(`homepage search and browse remain usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await expect(page.getByRole("search", { name: "Search skincare products" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Available now" })).toHaveAttribute("href", "/shop?stock=in-stock");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
