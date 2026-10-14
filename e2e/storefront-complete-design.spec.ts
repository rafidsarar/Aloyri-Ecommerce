import { test, expect, type Page } from "@playwright/test";

async function catalog(page: Page) {
  await page.route('**/api/catalog', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ products: [{ id: 'simple-wash', name: 'Refreshing Facial Wash', brand: 'Simple', size: '150ml', category: 'Cleanser', price: 749, active: true, availableStock: 12 }], generatedAt: new Date().toISOString() }) }));
  await page.route('**/_next/image?**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
}
for (const width of [320, 390, 1440]) {
  test(`product gallery and cart remain usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await catalog(page);
    await page.goto('/shop');
    await page.getByRole('link', { name: /Refreshing Facial Wash/ }).first().click();
    await expect(page.locator('.product-detail-page')).toBeVisible();
    const open = page.getByRole('button', { name: 'Enlarge image of Refreshing Facial Wash' });
    await open.click();
    const dialog = page.getByRole('dialog', { name: 'Refreshing Facial Wash enlarged image' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close image' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(open).toBeFocused();
    const buy = page.locator('.product-purchase-actions').getByRole('button', { name: 'Add to cart', exact: true });
    await expect(buy).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('product-detail.png'), fullPage: true });
    await buy.click();
    await page.getByRole('button', { name: /^Cart with 1 item$/ }).click();
    const cart = page.getByRole('dialog', { name: 'Shopping cart' });
    // Use the drawer's existing cart route to keep the in-memory cart intact.
    await cart.getByRole('link', { name: /View full cart/i }).click();
    await expect(page.locator('.cart-product-row')).toHaveCount(1);
    await page.getByRole('button', { name: 'Increase Refreshing Facial Wash quantity' }).click();
    await expect(page.locator('.cart-product-row')).toContainText('BDT 1,498');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('cart.png'), fullPage: true });
  });
}

test('care and account pages share responsive styling and usable forms', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/account', '/account/setup', '/contact', '/faq', '/shipping-delivery', '/returns-refunds', '/privacy', '/terms', '/track-order', '/compare', '/routine-finder']) {
    await page.goto(path);
    await expect(page.locator('.storefront-design main').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
  await page.goto('/faq');
  const faq = page.locator('.faq-page details').first();
  await faq.locator('summary').click();
  await expect(faq).toHaveAttribute('open', '');
  await page.screenshot({ path: testInfo.outputPath('faq-mobile.png'), fullPage: true });
});

for (const width of [390, 1440]) {
  test(`product page omits decorative skin ritual chapter at ${width}px while keeping details accessible`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await catalog(page);
    await page.goto("/shop");
    await page.getByRole("link", { name: /Refreshing Facial Wash/ }).first().click();
    const productPage = page.locator(".product-detail-page");
    await expect(productPage).toBeVisible();
    await expect(productPage.getByRole("heading", { name: "Refreshing Facial Wash" })).toBeVisible();
    await expect(productPage.locator(".kanva-product-chapter")).toHaveCount(0);
    await expect(productPage.getByText("Care that fits")).toHaveCount(0);
    await expect(productPage.locator(".kanva-product-orbit")).toHaveCount(0);
    const navigation = productPage.getByRole("navigation", { name: "Product information" });
    await expect(navigation).toBeVisible();
    await expect(productPage.locator("#product-use")).toBeAttached();
    await expect(productPage.locator("#product-ingredients")).toBeAttached();
    await expect(productPage.locator("#delivery-information")).toBeAttached();
    await navigation.getByRole("link", { name: "How to use" }).click();
    await expect(page).toHaveURL(/#product-use$/);
    await expect(productPage.locator(".product-purchase-actions")).toBeAttached();
  });
}
