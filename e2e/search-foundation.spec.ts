import { expect, test } from "@playwright/test";
import type { Product } from "../src/lib/catalog";
import {
  normalizeSearchText,
  productSearchScore,
} from "../src/lib/storefront-search";

function product(overrides: Partial<Product>): Product {
  return {
    id: "base",
    slug: "base",
    brand: "Aloyri",
    name: "Base Product",
    size: "100ml",
    category: "Skincare",
    price: 500,
    description: "Everyday skincare",
    routineStep: "Daily routine",
    skinNote: "Comfortable everyday use",
    texture: "Lightweight",
    bestFor: "Daily use",
    howToUse: [],
    careNotes: [],
    ingredientNote: "",
    visual: {
      from: "#fff",
      to: "#fff",
      accent: "#fff",
      ink: "#000",
      package: "tube",
    },
    ...overrides,
  };
}

test("search normalization is case, spacing and accent tolerant", () => {
  expect(normalizeSearchText("  Crème   SPF-50+ ")).toBe("creme spf 50");
});

test("multi-word queries require every token and prioritize name/brand relevance", () => {
  const simple = product({
    id: "simple-wash",
    brand: "Simple",
    name: "Refreshing Facial Wash",
    category: "Cleanser",
  });
  const cosrx = product({
    id: "cosrx",
    brand: "COSRX",
    name: "Low pH Good Morning Gel Cleanser",
    category: "Cleanser",
  });

  expect(productSearchScore(simple, "simple facial")).toBeGreaterThan(0);
  expect(productSearchScore(cosrx, "simple facial")).toBe(-1);
  expect(productSearchScore(simple, "refreshing facial wash")).toBeGreaterThan(
    productSearchScore(simple, "cleanser"),
  );
});

test("search can match discovery fields beyond the old four-field search", () => {
  const sunscreen = product({
    id: "uv-gel",
    name: "UV Gel",
    brand: "Rohto",
    category: "Sunscreen",
    texture: "Lightweight gel",
    bestFor: "Daily morning protection",
  });

  expect(productSearchScore(sunscreen, "lightweight")).toBeGreaterThan(0);
  expect(productSearchScore(sunscreen, "morning protection")).toBeGreaterThan(0);
  expect(productSearchScore(sunscreen, "night repair")).toBe(-1);
});


test("common one- and two-character typos still resolve conservatively", () => {
  const sunscreen = product({
    id: "sun",
    name: "Daily Sunscreen",
    brand: "Aloyri",
    category: "Sunscreen",
  });
  const moisturizer = product({
    id: "moist",
    name: "Light Moisturizer",
    brand: "Aloyri",
    category: "Moisturizer",
  });

  expect(productSearchScore(sunscreen, "suncreen")).toBeGreaterThan(0);
  expect(productSearchScore(moisturizer, "moisterizer")).toBeGreaterThan(0);
  expect(productSearchScore(sunscreen, "serum")).toBe(-1);
});
