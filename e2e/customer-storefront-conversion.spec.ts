import { expect, test } from "@playwright/test";

test.describe("customer storefront usability", () => {
  for (const width of [320, 375, 390, 768, 1280]) {
    test(`shop stays usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/shop");
      await expect(page.getByRole("combobox", { name: "Search skincare" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Sort" })).toBeVisible();
      await expect(page.getByText("Filter by brand, availability & price")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }

  test("mobile navigation and checkout entry are accessible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await page.goto("/cart");
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/checkout");
    await expect(page.locator("main")).toBeVisible();
  });
});
