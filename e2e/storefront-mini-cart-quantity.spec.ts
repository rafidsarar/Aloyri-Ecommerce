import { test, expect } from '@playwright/test';

for (const width of [320, 1440]) {
  test(`mini cart quantity updates totals and respects stock at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/catalog', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ products: [{ id: 'simple-wash', name: 'Refreshing Facial Wash', brand: 'Simple', size: '150ml', category: 'Cleanser', price: 749, active: true, availableStock: 2 }], generatedAt: new Date().toISOString() }) }));
    await page.goto('/shop');
    await page.getByRole('button', { name: 'Add Refreshing Facial Wash to cart', exact: true }).click();
    await page.getByRole('button', { name: 'Cart with 1 item', exact: true }).click();
    const cart = page.getByRole('dialog', { name: 'Shopping cart' });
    const minus = cart.getByRole('button', { name: 'Decrease Refreshing Facial Wash quantity' });
    const plus = cart.getByRole('button', { name: 'Increase Refreshing Facial Wash quantity' });
    await expect(minus).toBeDisabled();
    await plus.click();
    await expect(cart.getByRole('group', { name: 'Quantity for Refreshing Facial Wash' })).toContainText('Quantity: 2');
    await expect(cart.getByText('BDT 1,498', { exact: true })).toHaveCount(2);
    await expect(plus).toBeDisabled();
    await minus.click();
    await expect(cart.getByText('BDT 749', { exact: true })).toHaveCount(2);
    await expect(minus).toBeDisabled();
    expect(await cart.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await plus.click();
    await cart.getByRole('link', { name: 'View full cart' }).click();
    await expect(page.locator('.cart-product-row')).toContainText('BDT 1,498');
    await page.getByRole('button', { name: 'Cart with 2 items', exact: true }).click();
    await cart.getByRole('button', { name: 'Remove Refreshing Facial Wash from cart' }).click();
    await expect(cart.getByText('Your cart is empty.')).toBeVisible();
  });
}
