import { expect, test } from "@playwright/test";

const products = [
  { id: "simple-light", name: "Hydrating Light Moisturiser", brand: "Simple", size: "125ml", category: "Moisturizer", price: 749, active: true, availableStock: 10 },
  { id: "simple-rich", name: "Replenishing Rich Moisturizer", brand: "Simple", size: "125ml", category: "Moisturizer", price: 775, active: true, availableStock: 5 },
  { id: "cosrx", name: "Gel Cleanser", brand: "COSRX", size: "50ml", category: "Cleanser", price: 580, active: true, availableStock: 8 },
];

test("routine finder is discoverable and only uses current catalog products", async ({ page }) => {
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products, generatedAt: new Date().toISOString() }),
  }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Explore the routine finder/ })).toBeVisible();
  await page.getByRole("link", { name: /Explore the routine finder/ }).click();
  await expect(page).toHaveURL(/\/routine-finder/);
  await expect(page.getByRole("heading", { name: "Your skincare, made simpler." })).toBeVisible();
  await page.getByRole("button", { name: /Moisturize/ }).click();
  await page.getByRole("button", { name: "Next: texture" }).click();
  await page.getByRole("button", { name: "Lightweight feel" }).click();
  await page.getByRole("button", { name: "See your skincare edit" }).click();
  await expect(page.getByRole("link", { name: /Hydrating Light Moisturiser/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Replenishing Rich Moisturizer/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Gel Cleanser/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page.getByRole("heading", { name: "What would you like to shop for?" })).toBeVisible();
});

test("routine finder is reachable from mobile menu without login", async ({ page }) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog", {name: "Navigation menu"}).getByRole("link", {name: "Routine finder"}).click();
  await expect(page).toHaveURL(/\/routine-finder/);
  await expect(page.getByRole("heading", {name: "Your skincare, made simpler."})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
