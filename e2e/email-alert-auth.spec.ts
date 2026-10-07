import { expect, test } from "@playwright/test";
import { lifecyclePolicies, lifecyclePlanForDelivery } from "../src/lib/lifecycle-policy";
import { productAlertTriggers } from "../src/lib/product-alert-utils";

test("back-in-stock fires only after unavailable baseline becomes available", () => {
  expect(productAlertTriggers({
    kinds: ["back-in-stock"],
    baselinePrice: 500,
    baselineStock: 0,
    currentPrice: 500,
    currentStock: 4,
  })).toEqual(["back-in-stock"]);

  expect(productAlertTriggers({
    kinds: ["back-in-stock"],
    baselinePrice: 500,
    baselineStock: 2,
    currentPrice: 500,
    currentStock: 4,
  })).toEqual([]);
});

test("price-drop fires only below captured baseline", () => {
  expect(productAlertTriggers({
    kinds: ["price-drop"],
    baselinePrice: 700,
    baselineStock: 5,
    currentPrice: 650,
    currentStock: 5,
  })).toEqual(["price-drop"]);

  expect(productAlertTriggers({
    kinds: ["price-drop"],
    baselinePrice: 700,
    baselineStock: 5,
    currentPrice: 700,
    currentStock: 5,
  })).toEqual([]);
});

test("email lifecycle policies require explicit consent", () => {
  const protectedTriggers = new Set([
    "post-delivery-follow-up",
    "review-request",
    "reorder-reminder",
    "back-in-stock",
    "price-drop",
  ]);
  for (const policy of lifecyclePolicies) {
    if (protectedTriggers.has(policy.trigger)) {
      expect(policy.requiresConsent).toBe(true);
    }
  }
});

test("delivery plan schedules follow-up, review and reorder windows", () => {
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
});
