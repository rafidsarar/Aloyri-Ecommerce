import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("all product pages use a ritual-free shared template", () => {
  const component = readFileSync("src/components/live-product-page.tsx", "utf8");
  expect(component).not.toContain("kanva-product-chapter");
  expect(component).not.toContain("Care that fits");
  expect(component).not.toContain("THE ALOYRI SKIN RITUAL");
  expect(component).not.toContain("kanva-product-orbit");
  expect(component).toContain('<nav id="product-details" aria-label="Product information"');
  expect(component).toContain('id="product-use"');
  expect(component).toContain('id="product-ingredients"');
});

for (const slug of ["simple-hydrating-light-moisturiser", "simple-refreshing-facial-wash"]) {
  test(`product ${slug} no longer displays ritual promotion`, async ({ page }) => {
    await page.goto(`/product/${slug}`);
    await expect(page.locator(".kanva-product-chapter")).toHaveCount(0);
    await expect(page.getByText("Care that fits", { exact: false })).toHaveCount(0);
    await expect(page.getByText("THE ALOYRI SKIN RITUAL")).toHaveCount(0);
  });
}
