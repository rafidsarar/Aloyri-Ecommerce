import { expect, test } from "@playwright/test";

test.describe("checkout and cart mobile usability", () => {
  for (const width of [320, 375, 390, 768]) {
    test(`guest checkout preserves authentication and fits ${width}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/checkout");
      await expect(page).toHaveURL(/\/account\/setup\?next=/);
      await expect(page.getByRole("link", { name: "Sign in with Google" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test(`empty cart stays inside ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/cart");
      await expect(page.getByRole("heading", { name: "Cart." })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
