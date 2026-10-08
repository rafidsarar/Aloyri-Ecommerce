import { expect, test, type Page } from "@playwright/test";

const products = [
  { id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 12 },
  { id: "skin-aqua", name: "Skin Aqua Super Moisture UV Gel", brand: "Rohto", size: "110g · SPF50+ PA++++", category: "Sunscreen", price: 1350, active: true, availableStock: 7 },
];

async function mockCatalog(page: Page) {
  await page.route("**/api/catalog", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products, generatedAt: new Date().toISOString() }),
  }));
  await page.route("**/_next/image?**", (route) => route.fulfill({
    status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
  }));
}

test("desktop discovery opens on click and closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const explore = page.getByRole("button", { name: /Explore/ });
  await expect(explore).toBeVisible();
  await explore.click();
  await expect(explore).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Explore skincare").getByRole("link", { name: "Cleansers" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(explore).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("routine finder suggests only current in-stock products without account", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/routine-finder");
  await expect(page.getByRole("heading", { name: "Find your everyday ritual." })).toBeVisible();
  await page.getByRole("button", { name: /Dry or tight/ }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: /Hydration/ }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: /Build a three-step routine/ }).click();
  await page.getByRole("button", { name: "See your picks" }).click();
  await expect(page.getByRole("heading", { name: "A simple place to begin." })).toBeVisible();
  await expect(page.getByText("Refreshing Facial Wash", { exact: true })).toBeVisible();
  await expect(page.getByText("Skin Aqua Super Moisture UV Gel", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.includes("routine-finder")))).toBe(false);
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
});

test("guest quick-add from shop respects cart and login-required checkout", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/shop");
  const add = page.getByRole("button", { name: "Add Refreshing Facial Wash to cart" });
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByRole("link", { name: "Cart with 1 item" })).toBeVisible();
  await page.getByRole("link", { name: "Cart with 1 item" }).click();
  await expect(page.getByText("Refreshing Facial Wash", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: /Continue to checkout/ }).click();
  await expect(page).toHaveURL(/\/account\/setup/);
});

test("mobile customer journey exposes finder and no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Navigation menu" });
  await menu.getByRole("link", { name: "Routine finder" }).click();
  await expect(page).toHaveURL(/\/routine-finder/);
  await expect(page.getByRole("dialog", { name: "Navigation menu" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("published focus choices filter the live shop and remain shareable", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/shop?focus=spf");
  const dailySpf = page.getByRole("button", { name: "Daily SPF" });
  await expect(dailySpf).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /Skin Aqua Super Moisture UV Gel/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Refreshing Facial Wash/ })).toHaveCount(0);
  await page.getByRole("button", { name: "All focuses" }).click();
  await expect(page.getByRole("link", { name: /Refreshing Facial Wash/ })).toBeVisible();
  await page.getByRole("link", { name: "Shop bestsellers" }).click();
  await expect(page.getByRole("combobox", { name: "Sort" })).toHaveValue("bestseller");
});
