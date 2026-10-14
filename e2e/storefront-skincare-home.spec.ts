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
    await expect(page.locator("#routine-finder-feature")).toBeVisible();
    await expect(page.locator('section[aria-labelledby="routine-finder-feature"]').getByRole("link", { name: "Find your routine", exact: true })).toHaveAttribute("href", "/routine-finder");
    await expect(page.getByText("Tell us what feels right")).toBeVisible();
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

for (const width of [390, 1024, 1440]) {
  test(`routine finder has rounded, aligned cards with readable content at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const section = page.locator(".home-finder-scroll-section");
    await expect(section).toBeVisible();
    const cards = section.locator(".home-finder-scroll-card");
    await expect(cards).toHaveCount(3);
    const details = await cards.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const title = element.querySelector("div > p:first-child")?.getBoundingClientRect();
      const number = element.querySelector("span")?.getBoundingClientRect();
      return {
        width: rect.width, left: rect.left,
        radius: parseFloat(style.borderTopLeftRadius),
        border: parseFloat(style.borderTopWidth),
        padding: parseFloat(style.paddingLeft),
        position: style.position,
        titleInside: Boolean(title && title.left >= rect.left && title.right <= rect.right + 1),
        numberInside: Boolean(number && number.left >= rect.left && number.right <= rect.right + 1),
      };
    }));
    for (const card of details) {
      expect(card.radius).toBeGreaterThanOrEqual(20);
      expect(card.border).toBeGreaterThanOrEqual(1);
      expect(card.padding).toBeGreaterThanOrEqual(20);
      expect(card.titleInside).toBe(true);
      expect(card.numberInside).toBe(true);
      if (width >= 1024) expect(card.position).toBe("sticky");
    }
    expect(Math.max(...details.map(d => d.width)) - Math.min(...details.map(d => d.width))).toBeLessThan(2);
    expect(Math.max(...details.map(d => d.left)) - Math.min(...details.map(d => d.left))).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
