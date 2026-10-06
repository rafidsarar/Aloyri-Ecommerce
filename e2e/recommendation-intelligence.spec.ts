import { expect, test } from "@playwright/test";
import type { Product } from "../src/lib/catalog";
import {
  buildProductRecommendations,
  defaultRecommendationConfig,
  normalizeRecommendationConfig,
} from "../src/lib/recommendations";

function product(
  id: string,
  category: string,
  overrides: Partial<Product> = {},
): Product {
  return {
    id,
    slug: id,
    brand: "Aloyri Test",
    name: id,
    size: "50ml",
    category,
    price: 700,
    description: "Test product",
    routineStep: category,
    skinNote: "Test note",
    texture: "Test texture",
    bestFor: "Test routine",
    howToUse: ["Use as directed."],
    careNotes: [],
    ingredientNote: "See pack.",
    visual: {
      from: "#ffffff",
      to: "#ffffff",
      accent: "#000000",
      ink: "#000000",
      package: "tube",
    },
    active: true,
    availableStock: 10,
    ...overrides,
  };
}

test("manual relationships are preserved and hidden candidates are excluded", () => {
  const cleanser = product("cleanser-a", "Cleanser");
  const alt = product("cleanser-b", "Cleanser");
  const hidden = product("cleanser-c", "Cleanser");
  const moisturizer = product("moist-a", "Moisturizer");

  const config = normalizeRecommendationConfig({
    ...defaultRecommendationConfig,
    rules: {
      "cleanser-a": {
        relatedProductIds: ["cleanser-c", "cleanser-b"],
        routineProductIds: ["moist-a"],
        boost: 0,
        hidden: false,
      },
      "cleanser-c": {
        relatedProductIds: [],
        routineProductIds: [],
        boost: 100,
        hidden: true,
      },
    },
  });

  const result = buildProductRecommendations(
    cleanser,
    [cleanser, alt, hidden, moisturizer],
    config,
  );

  expect(result.related.map((item) => item.id)).toEqual(["cleanser-b"]);
  expect(result.routine.map((item) => item.id)).toEqual(["moist-a"]);
});

test("automatic fallback builds alternatives and complementary routine steps", () => {
  const cleanser = product("cleanser-a", "Cleanser");
  const alternative = product("cleanser-b", "Cleanser");
  const moisturizer = product("moist-a", "Moisturizer");
  const sunscreen = product("spf-a", "Sunscreen");

  const result = buildProductRecommendations(
    cleanser,
    [cleanser, alternative, moisturizer, sunscreen],
    defaultRecommendationConfig,
  );

  expect(result.related.map((item) => item.id)).toContain("cleanser-b");
  expect(result.routine.map((item) => item.id)).toEqual(
    expect.arrayContaining(["moist-a", "spf-a"]),
  );
});

test("recommendation boost changes automatic fallback ranking only", () => {
  const source = product("source", "Cleanser");
  const first = product("first", "Cleanser");
  const boosted = product("boosted", "Cleanser");

  const config = normalizeRecommendationConfig({
    ...defaultRecommendationConfig,
    maxRelated: 2,
    rules: {
      boosted: {
        relatedProductIds: [],
        routineProductIds: [],
        boost: 80,
        hidden: false,
      },
    },
  });

  const result = buildProductRecommendations(
    source,
    [source, first, boosted],
    config,
  );

  expect(result.related[0]?.id).toBe("boosted");
});
