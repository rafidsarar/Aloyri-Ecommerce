import { expect, test } from "@playwright/test";

const catalog = {
  generatedAt: "2026-10-10T00:00:00.000Z",
  categories: ["Cleanser", "Moisturizer"],
  products: [{
    id: "test-cleanser", name: "Daily Cleanser", brand: "Aloyri",
    category: "Cleanser", size: "100ml", price: 400, active: true, availableStock: 6,
  }],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
});

test("hero shows a compact multi-banner rail with accessible controls and destinations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const carousel = page.locator(".store-campaign-carousel");
  await expect(carousel).toBeVisible();
  const cards = carousel.locator(".store-campaign-slide");
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(2);
  await expect(carousel.getByRole("button", { name: "Next campaign" })).toBeVisible();
  const track = carousel.locator(".store-campaign-track");
  expect(await track.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await expect(carousel.getByRole("button", { name: "Show campaign 1" })).toHaveAttribute("aria-current", "true");
  await carousel.getByRole("button", { name: "Next campaign" }).click();
  await expect(carousel.getByRole("button", { name: "Show campaign 2" })).toHaveAttribute("aria-current", "true");
  await carousel.getByRole("button", { name: "Previous campaign" }).click();
  await expect(carousel.getByRole("button", { name: "Show campaign 1" })).toHaveAttribute("aria-current", "true");
  if (await carousel.getByRole("link", { name: "Shop bestsellers" }).count()) {
    await expect(carousel.getByRole("link", { name: "Shop bestsellers" })).toHaveAttribute("href", "/shop?sort=bestseller");
    await expect(carousel.getByRole("link", { name: "Find your routine" })).toHaveAttribute("href", "/routine-finder");
  }
  const cardHeight = await cards.first().evaluate(node => node.getBoundingClientRect().height);
  expect(cardHeight).toBeLessThan(500);
});

for (const width of [320, 390, 768, 1440]) {
  test("hero carousel stays inside the page at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const carousel = page.locator(".store-campaign-carousel");
    await expect(carousel).toBeVisible();
    const track = carousel.locator(".store-campaign-track");
    expect(await track.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await carousel.getByRole("button", { name: "Next campaign" }).click();
    await expect(carousel.getByRole("button", { name: "Show campaign 2" })).toHaveAttribute("aria-current", "true");
  });
}

test("reduced motion disables automatic rotation without removing manual controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const carousel = page.locator(".store-campaign-carousel");
  await expect(carousel).toBeVisible();
  await page.clock.fastForward(7000);
  await expect(carousel.getByRole("button", { name: "Show campaign 1" })).toHaveAttribute("aria-current", "true");
  await carousel.getByRole("button", { name: "Next campaign" }).click();
  await expect(carousel.getByRole("button", { name: "Show campaign 2" })).toHaveAttribute("aria-current", "true");
});
