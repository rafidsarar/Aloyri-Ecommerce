import { expect, test } from "@playwright/test";

test.describe("no-code storefront builder", () => {
  for (const width of [320, 390, 768, 1280]) {
    test(`published homepage remains responsive at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await expect(page.locator("main")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("unauthed website control center and settings remain protected", async ({ page }) => {
    await page.goto("/admin/builder");
    await expect(page).not.toHaveURL(/\/admin\/builder$/);
    await page.goto("/admin/settings");
    await expect(page).not.toHaveURL(/\/admin\/settings$/);
  });

  test("unpublished customization tools are protected", async ({ page }) => {
    await page.goto("/admin/preview-device");
    await expect(page).not.toHaveURL(/\/admin\/preview-device$/);
  });

  test("shopping remains accessible after the section builder", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Cart(?: with .*)?$/ }).first()).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("navigation", { name: "Account shortcuts" }).getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
  });
});
