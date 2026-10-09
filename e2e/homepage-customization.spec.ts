import { expect, test } from "@playwright/test";

test("homepage remains usable with default, disabled promotional banners", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("customer-facing promotional content never replaces account or checkout links", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("navigation", { name: "Account shortcuts" }).getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
  await expect(page.getByRole("button", { name: /^Cart(?: with .*)?$/ }).first()).toBeVisible();
});
