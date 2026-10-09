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
    await expect(page.locator(".store-header").getByRole("link", { name: "Track order" })).toHaveCount(0);
    const accountButton = page.getByRole("button", { name: "Account menu" });
    await expect(accountButton).toHaveAttribute("aria-expanded", "false");
    await accountButton.click();
    const accountMenu = page.getByRole("navigation", { name: "Account shortcuts" });
    await expect(accountButton).toHaveAttribute("aria-expanded", "true");
    await expect(accountMenu.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
    await expect(accountMenu.getByRole("link", { name: "My orders" })).toHaveAttribute("href", "/account#orders");
    await expect(accountMenu.getByRole("link", { name: "Track order" })).toHaveAttribute("href", "/track-order");
    await expect(accountMenu.getByRole("link", { name: "My cart" })).toHaveAttribute("href", "/cart");
    await page.keyboard.press("Escape");
    await expect(accountMenu).toHaveCount(0);
    await expect(page.locator(".store-header")).toBeVisible();
    await expect(page.locator(".store-footer")).toBeVisible();
    const accent = await page.locator("body").evaluate((element) => getComputedStyle(element).getPropertyValue("--store-accent").trim());
    expect(accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("mobile account dropdown provides all shortcuts outside the hamburger drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Store navigation menu" });
    await expect(drawer.getByRole("navigation", { name: "Customer tools" })).toHaveCount(0);
    await drawer.getByRole("button", { name: "Close menu" }).click();
    const accountButton = page.getByRole("button", { name: "Account menu" });
    await expect(accountButton).toBeVisible();
    await accountButton.click();
    const accountMenu = page.getByRole("navigation", { name: "Account shortcuts" });
    await expect(accountMenu.getByRole("link", { name: "My account" })).toBeVisible();
    await expect(accountMenu.getByRole("link", { name: "My orders" })).toBeVisible();
    await expect(accountMenu.getByRole("link", { name: "My cart" })).toBeVisible();
    await accountMenu.getByRole("link", { name: "Track order" }).click();
    await expect(page).toHaveURL(/\/track-order/);
    await expect(accountMenu).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
