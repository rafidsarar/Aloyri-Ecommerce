import { expect, test } from "@playwright/test";
import type { Product } from "../src/lib/catalog";
import { lifecyclePlanForDelivery } from "../src/lib/lifecycle-policy";
import {
  buildRoutineSuggestions,
  customerLifecycleState,
  replenishmentEstimate,
} from "../src/lib/retention-utils";

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
    size: "100ml",
    category,
    price: 500,
    description: "Test product",
    routineStep: category,
    skinNote: "Test",
    texture: "Test",
    bestFor: "Test",
    howToUse: ["Use"],
    careNotes: ["Care"],
    ingredientNote: "Ingredients",
    visual: {
      from: "#fff",
      to: "#fff",
      accent: "#000",
      ink: "#000",
      package: "bottle",
    },
    active: true,
    availableStock: 10,
    ...overrides,
  };
}

test("replenishment window becomes due after the category estimate", () => {
  const estimate = replenishmentEstimate(
    "2026-01-01",
    "Sunscreen",
    1,
    new Date("2026-03-15T12:00:00Z"),
  );
  expect(estimate?.status).toBe("due");
  expect(estimate?.baseDays).toBe(45);
});

test("routine suggestions fill missing categories and avoid purchased products", () => {
  const catalog = [
    product("cleanser", "Cleanser", { bestseller: true }),
    product("moisturizer", "Moisturizer", { featured: true }),
    product("sunscreen", "Sunscreen", { bestseller: true }),
    product("sold-out", "Sunscreen", { availableStock: 0 }),
  ];
  const suggestions = buildRoutineSuggestions(["cleanser"], catalog, 3);
  expect(suggestions.map((item) => item.id)).toEqual([
    "moisturizer",
    "sunscreen",
  ]);
});

test("customer lifecycle distinguishes returning, at-risk and re-engaged cohorts", () => {
  expect(
    customerLifecycleState(
      ["2026-08-01T00:00:00Z", "2026-09-20T00:00:00Z"],
      [],
      new Date("2026-10-07T00:00:00Z"),
    ),
  ).toBe("Returning");

  expect(
    customerLifecycleState(
      ["2026-01-01T00:00:00Z"],
      [],
      new Date("2026-10-07T00:00:00Z"),
    ),
  ).toBe("At risk");

  expect(
    customerLifecycleState(
      ["2026-01-01T00:00:00Z", "2026-09-25T00:00:00Z"],
      [],
      new Date("2026-10-07T00:00:00Z"),
    ),
  ).toBe("Re-engaged");
});

test("lifecycle planning creates post-delivery, review and reorder due dates", () => {
  const plan = lifecyclePlanForDelivery({
    deliveredAt: "2026-10-01",
    categoryDays: [45, 60],
  });
  expect(plan.map((row) => row.trigger)).toEqual([
    "post-delivery-follow-up",
    "review-request",
    "reorder-reminder",
  ]);
  expect(plan[0].dueAt.startsWith("2026-10-04")).toBe(true);
  expect(plan[1].dueAt.startsWith("2026-10-08")).toBe(true);
  expect(plan[2].dueAt.startsWith("2026-11-07")).toBe(true);

  const fallbackPlan = lifecyclePlanForDelivery({
    deliveredAt: "2026-10-01",
    categoryDays: [Number.NaN, 0],
  });
  expect(fallbackPlan[2].dueAt.startsWith("2026-11-19")).toBe(true);
});
