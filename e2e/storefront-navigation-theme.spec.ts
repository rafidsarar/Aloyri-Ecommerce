import { expect, test } from "@playwright/test";

test.describe("storefront appearance and navigation", () => {
  test("theme tokens and customer tools appear on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("body")).toHaveAttribute("data-storefront-theme", /^(rose|sage|sand)$/);
    const opener = page.getByRole("button", { name: "Open menu" });
    await expect(opener).toBeVisible();
    await opener.click();
    const drawer = page.getByRole("dialog", { name: "Store navigation menu" });
    await expect(drawer.getByRole("navigation", { name: "Store navigation" }).getByRole("link", { name: "Shop all" })).toBeVisible();
    await drawer.getByRole("button", { name: "Close menu" }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Track order", exact: true }).first()).toBeVisible();
    await expect(page.locator(".store-header")).toBeVisible();
    await expect(page.locator(".store-footer")).toBeVisible();
    const accent = await page.locator("body").evaluate((element) => getComputedStyle(element).getPropertyValue("--store-accent").trim());
    expect(accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("mobile menu exposes account and login-free order tracking", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Store navigation menu" });
    await expect(menu.getByRole("link", { name: "My account" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Track order" })).toBeVisible();
    await menu.getByRole("link", { name: "Track order" }).click();
    await expect(page).toHaveURL(/\/track-order/);
    await expect(page.getByRole("dialog", { name: "Store navigation menu" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
