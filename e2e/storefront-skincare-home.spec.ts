import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`skincare homepage remains readable and navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("main.skincare-home")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Shop by skincare focus" })).toHaveCount(0);
    await expect(page.locator(".home-focus-card")).toHaveCount(0);
    await expect(page.locator("#routine-finder-feature")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Shop and discover" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/storefront-skincare-${width}/homepage.png`, fullPage: true });
  });
}

test("shoppers can pause hero rotation while retaining manual navigation", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Pause banner rotation" }).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(14000);
  await expect(page.getByRole("button", { name: "Show campaign 1" })).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: "Next campaign" }).click();
  await expect(page.getByRole("button", { name: "Show campaign 2" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("button", { name: "Resume banner rotation" })).toHaveAttribute("aria-pressed", "true");
});
