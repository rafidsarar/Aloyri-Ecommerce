import { expect, test } from "@playwright/test";
import { analyticsCollectionEnabled } from "../src/lib/analytics-collection";
import { isRejectedCheckout } from "../src/lib/order-sync-status";
import { descriptiveSeoTitle } from "../src/lib/seo-defaults";

test("structured analytics defaults on and preserves explicit opt-outs", () => {
  expect(analyticsCollectionEnabled(true)).toBe(true);
  expect(analyticsCollectionEnabled(false, "1")).toBe(false);
  expect(analyticsCollectionEnabled(true, "0")).toBe(false);
  expect(analyticsCollectionEnabled(true, undefined, "0")).toBe(false);
  expect(analyticsCollectionEnabled(true, "1", "0")).toBe(true);
  expect(analyticsCollectionEnabled(true, "invalid")).toBe(false);
});

test("promotion rejection never hides a confirmed order or another sync failure", () => {
  expect(isRejectedCheckout({ state: "attention", error: "PROMOTION_NOT_AVAILABLE" })).toBe(true);
  expect(isRejectedCheckout({ state: "attention", error: "PROMOTION_NOT_AVAILABLE", result: { orderId: "confirmed" } })).toBe(false);
  expect(isRejectedCheckout({ state: "pending", error: "PROMOTION_NOT_AVAILABLE" })).toBe(false);
  expect(isRejectedCheckout({ state: "attention", error: "ORDER_EFFECT_FAILED" })).toBe(false);
});

test("SEO upgrades legacy defaults while preserving custom titles", () => {
  expect(descriptiveSeoTitle("Shop skincare", "/shop")).toBe("Shop Skincare in Bangladesh");
  expect(descriptiveSeoTitle("My skincare selection", "/shop")).toBe("My skincare selection");
  expect(descriptiveSeoTitle("Cleansers", "/other")).toBe("Cleansers");
});

test("default social card is a real 1200 by 630 PNG", async ({ request }) => {
  const response = await request.get("/social-image");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test("storefront falls back to fetch when beacon queue rejects an event", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "doNotTrack", { value: "0", configurable: true });
    Object.defineProperty(navigator, "sendBeacon", { value: () => false, configurable: true });
  });
  const events: string[] = [];
  await page.route("**/api/analytics", async route => {
    events.push(route.request().postDataJSON().event);
    await route.fulfill({ status: 204 });
  });
  await page.goto("/");
  await expect.poll(() => events).toContain("page_view");
});
