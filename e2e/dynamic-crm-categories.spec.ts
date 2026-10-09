import { expect, test } from "@playwright/test";
import {
  buildCategoryDirectory,
  categoryNamesFromCatalog,
  matchesCategory,
  resolveCatalogCategory,
  slugForCategory,
} from "../src/lib/storefront-categories";

test("CRM category registry includes empty categories and deduplicates labels", () => {
  const product = [{ category: "Cleanser" }, { category: "Hair Care" }];
  const items = buildCategoryDirectory(
    ["Cleanser", "Moisturizer", "Sunscreen", "Lip care", "Other", "  hair care "],
    product,
  );
  expect(items.map(item => item.name)).toEqual([
    "Cleanser", "Moisturizer", "Sunscreen", "Lip care", "Other", "hair care",
  ]);
  expect(items.map(item => item.href)).toEqual([
    "/category/cleansers", "/category/moisturizers", "/category/sunscreen",
    "/category/lip-care", "/category/other", "/category/hair-care",
  ]);
  expect(resolveCatalogCategory("lip-care", items.map(item => item.name), [])?.name).toBe("Lip care");
  expect(matchesCategory("hair CARE", "Hair care")).toBe(true);
});

test("new category paths and legacy routes are independent of a static allowlist", () => {
  expect(slugForCategory("Acne / Pimple Patches")).toBe("acne-pimple-patches");
  expect(slugForCategory("Cleanser")).toBe("cleansers");
  expect(slugForCategory("Moisturizer")).toBe("moisturizers");
  expect(slugForCategory("Sunscreen")).toBe("sunscreen");
  expect(categoryNamesFromCatalog(undefined, [{ category: "Body care" }])).toEqual(["Body care"]);
  expect(buildCategoryDirectory(["Hair care", "Hair-care"], []).map(item => item.slug)).toHaveLength(2);
  expect(new Set(buildCategoryDirectory(["Hair care", "Hair-care"], []).map(item => item.slug)).size).toBe(2);
});

test("storefront category menu and shop filters refresh when CRM adds a category", async ({ page }) => {
  let categoryNames = ["Cleanser", "Moisturizer", "Sunscreen", "Lip care"];
  const crmProducts = [{
    id: "crm-cleanser", name: "Daily Face Wash", brand: "Aloyri", size: "100ml",
    category: "Cleanser", price: 500, active: true, availableStock: 6,
  }];
  await page.route("**/api/catalog", route => route.fulfill({
    status: 200,
    json: { generatedAt: new Date().toISOString(), categories: categoryNames, products: crmProducts },
    headers: { "Cache-Control": "no-store" },
  }));

  await page.goto("/shop");
  await expect(page.getByRole("button", { name: /Lip care/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Lip care/ }).click();
  await expect(page.getByRole("button", { name: /Lip care/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "All skincare" }).click();

  categoryNames = [...categoryNames, "Hair & scalp"];
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByRole("button", { name: /Hair & scalp/ })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation menu" }).getByRole("link", { name: "Hair & scalp" }))
    .toHaveAttribute("href", "/category/hair-scalp");
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Hair & scalp" }))
    .toHaveAttribute("href", "/category/hair-scalp");
});
