import { expect, test } from "@playwright/test";

test.describe("homepage visual shopping", () => {
  test("desktop shopper can browse visual categories and search products", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What are you looking for today?" })).toBeVisible();
    const categories = page.locator('[aria-labelledby="shop-by-category"]');
    // Category cards follow the CRM registry, so a workspace is not
    // required to have the original three skincare categories.
    const categoryLinks = categories.locator('a[href^="/category/"]');
    await expect(categoryLinks.first()).toBeVisible();
    const hrefs = await categoryLinks.evaluateAll(links => links.map(link => link.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.every(href => typeof href === "string" && href.startsWith("/category/") && !href.includes(".."))).toBe(true);
    await page.getByRole("search", { name: "Search skincare products" }).getByRole("button", { name: "Search products and brands" }).click();
    const searchModal = page.getByRole("dialog", { name: "Search discovery" });
    await searchModal.getByRole("combobox", { name: "Search skincare" }).fill("sunscreen");
    await expect(page).toHaveURL("/");
    await searchModal.getByRole("button", { name: /View all results for/ }).click();
    await expect(page).toHaveURL(/\/shop\?q=sunscreen/);
    await expect(page.getByRole("heading", { name: "Shop skincare." })).toBeVisible();
  });

  for (const width of [320, 390, 768, 1280]) {
    test(`homepage search and browse remain usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const search = page.getByRole("search", { name: "Search skincare products" });
      await expect(search).toBeVisible();
      // The minimal search design keeps shortcuts inside the focused overlay.
      await search.getByRole("button", { name: "Search products and brands" }).click();
      const discovery = page.getByRole("dialog", { name: "Search discovery" });
      await expect(discovery).toBeVisible();
      await expect(discovery.getByRole("link", { name: "Available now" })).toHaveAttribute("href", "/shop?stock=in-stock");
      await expect(discovery.getByRole("link", { name: "Find my routine" })).toHaveAttribute("href", "/routine-finder");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await discovery.getByRole("button", { name: "Close search" }).click();
      await expect(discovery).toHaveCount(0);
    });
  }
});
