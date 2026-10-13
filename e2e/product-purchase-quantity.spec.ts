import { expect, test } from '@playwright/test';

for (const width of [320, 1440]) {
  test(`product quantity respects stock already in cart at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/catalog', route => route.fulfill({ json: {
      generatedAt: new Date().toISOString(), categories: ['Cleanser'],
      products: [{ id: 'simple-wash', name: 'Refreshing Facial Wash', brand: 'Simple', size: '150ml', category: 'Cleanser', price: 749, active: true, availableStock: 3 }],
    } }));
    await page.goto('/shop');
    await page.getByRole('link', { name: /Refreshing Facial Wash/ }).first().click();
    const panel = page.locator('.product-purchase-actions');
    const plus = panel.getByRole('button', { name: 'Increase quantity', exact: true });
    const minus = panel.getByRole('button', { name: 'Decrease quantity', exact: true });
    await expect(minus).toBeDisabled();
    await plus.click();
    await expect(panel.getByLabel('Selected quantity')).toHaveText('2');
    await panel.getByRole('button', { name: 'Add to cart', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cart with 2 items', exact: true })).toBeVisible();
    await expect(panel.getByLabel('Selected quantity')).toHaveText('1');
    await expect(plus).toBeDisabled();
    await panel.getByRole('button', { name: 'Add to cart', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cart with 3 items', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Stock limit reached', exact: true })).toBeDisabled();
    await expect(page.locator('.product-gallery-image').first()).toHaveCSS('transform', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
