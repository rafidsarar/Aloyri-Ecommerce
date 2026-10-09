import { expect, test, type Page } from "@playwright/test";

const products = [
  { id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 6 },
];
async function withCatalog(page: Page) {
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products, generatedAt: new Date().toISOString() }),
  }));
  await page.route("**/_next/image?**", route => route.fulfill({
    status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
  }));
}

test("cart icon opens a full-height themed drawer with keyboard dismissal and quick removal", async ({ page }) => {
  await withCatalog(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop");
  await page.getByRole("button", { name: "Add Refreshing Facial Wash to cart" }).click();
  const cartButton = page.getByRole("button", { name: "Cart with 1 item" });
  await expect(cartButton).toBeVisible();
  await cartButton.click();
  const drawer = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Refreshing Facial Wash", { exact: true })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Proceed to checkout" })).toHaveAttribute("href", "/checkout");
  const geometry = await drawer.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, right: rect.right, height: rect.height, vw: innerWidth, vh: innerHeight };
  });
  expect(geometry.right).toBe(geometry.vw);
  expect(geometry.height).toBe(geometry.vh);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(cartButton).toBeFocused();

  await cartButton.click();
  await drawer.getByRole("button", { name: "Remove Refreshing Facial Wash from cart" }).click();
  await expect(page.getByRole("button", { name: "Cart", exact: true })).toBeVisible();
  await expect(drawer.getByText("Your cart is empty.")).toBeVisible();
  await drawer.getByRole("link", { name: "Continue shopping" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("cart drawer blocks direct checkout when CRM stock has not been verified", async ({ page }) => {
  await withCatalog(page);
  await page.goto("/shop");
  await page.getByRole("button", { name: "Add Refreshing Facial Wash to cart" }).click();
  await page.getByRole("button", { name: "Cart with 1 item" }).click();
  const drawer = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(drawer.getByRole("link", { name: "Proceed to checkout" })).toBeVisible();
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products: products.map(product => ({ ...product, availableStock: 0 })), generatedAt: new Date().toISOString() }),
  }));
  await page.reload();
  await page.getByRole("button", { name: "Cart with 1 item" }).click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" }).getByRole("link", { name: "Proceed to checkout" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Shopping cart" }).getByRole("link", { name: "Review cart and availability" })).toBeVisible();
});
