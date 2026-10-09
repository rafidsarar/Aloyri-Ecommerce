import { expect, test } from "@playwright/test";

const catalog = {
  generatedAt: "2026-10-09T00:00:00.000Z",
  categories: ["Cleanser", "Moisturizer", "Lip care"],
  products: [{ id: "crm-cleansing-wash", name: "Daily Cleanser", brand: "Aloyri", size: "100ml",
    category: "Cleanser", price: 420, active: true, availableStock: 8 }],
};

test("desktop left drawer supports CRM categories, accordion, and backdrop dismissal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Open menu" });
  await expect(opener).toBeVisible();
  await opener.click();

  const drawer = page.getByRole("dialog", { name: "Store navigation menu" });
  await expect(drawer).toBeVisible();
  await expect(opener).toHaveAttribute("aria-expanded", "true");
  const categoryToggle = drawer.getByRole("button", { name: /Shop by category/ });
  await expect(categoryToggle).toHaveAttribute("aria-expanded", "true");
  await expect(drawer.getByRole("link", { name: "Lip care" })).toHaveAttribute("href", "/category/lip-care");
  await categoryToggle.click();
  await expect(categoryToggle).toHaveAttribute("aria-expanded", "false");
  await expect(drawer.getByRole("link", { name: "Lip care" })).toHaveCount(0);
  await categoryToggle.click();
  await expect(drawer.getByRole("link", { name: "Lip care" })).toBeVisible();

  await expect(drawer.getByRole("navigation", { name: "Customer tools" })).toHaveCount(0);
  await expect(drawer.getByRole("link", { name: "My orders" })).toHaveCount(0);
  await expect(drawer.getByRole("link", { name: "My cart" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();

  await opener.click();
  await page.getByRole("button", { name: "Close navigation overlay" }).click({ position: { x: 1000, y: 200 } });
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("mobile drawer navigates from the left without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/catalog", route => route.fulfill({ status: 200, json: catalog }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Store navigation menu" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Track order" })).toHaveCount(0);
  await expect(drawer.getByRole("link", { name: "Lip care" })).toBeVisible();
  await drawer.getByRole("link", { name: "Lip care" }).click();
  await expect(page).toHaveURL(/\/category\/lip-care/);
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
