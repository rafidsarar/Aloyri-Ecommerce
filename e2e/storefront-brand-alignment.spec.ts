import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1060, 1440]) {
  test(`brand stays centered and navigation fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const brand = page.locator(".store-header-brand");
    await expect(brand).toBeVisible();
    const geometry = await brand.evaluate(element => {
      const box = element.getBoundingClientRect();
      const actions = document.querySelector(".store-header-actions")!.getBoundingClientRect();
      return { center: box.x + box.width / 2, right: box.right, actionsLeft: actions.left, viewport: innerWidth };
    });
    expect(Math.abs(geometry.center - geometry.viewport / 2)).toBeLessThan(2);
    expect(geometry.right).toBeLessThanOrEqual(geometry.actionsLeft);
    await expect(brand.locator("svg")).toHaveAttribute("viewBox", "15 115 1965 420");
    expect((await page.request.get("/brand/aloyri-original.png")).ok()).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Store navigation menu" });
    await expect(drawer.getByRole("link", { name: "Search products and brands" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "My account", exact: true })).toBeVisible();
    expect(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeFocused();
  });
}
