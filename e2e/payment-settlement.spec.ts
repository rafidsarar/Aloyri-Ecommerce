import { expect, test } from "@playwright/test";
import {
  canTransitionSettlement,
  normalizeBdt,
  paymentProviderFor,
  refundStateForAmount,
  validRefundAmount,
} from "../src/lib/payment-settlement-model";

test("settlement transitions protect paid and refund states", () => {
  expect(canTransitionSettlement("pending", "paid")).toBe(true);
  expect(canTransitionSettlement("paid", "refund_pending")).toBe(true);
  expect(canTransitionSettlement("refund_pending", "refunded")).toBe(true);
  expect(canTransitionSettlement("pending", "refunded")).toBe(false);
  expect(canTransitionSettlement("refunded", "paid")).toBe(false);
});

test("refund amounts cannot exceed the captured order total", () => {
  expect(validRefundAmount(1500, 1500)).toBe(true);
  expect(validRefundAmount(1500, 500)).toBe(true);
  expect(validRefundAmount(1500, 1500.01)).toBe(false);
  expect(refundStateForAmount(1500, 500)).toBe("partially_refunded");
  expect(refundStateForAmount(1500, 1500)).toBe("refunded");
});

test("money and payment providers normalize deterministically", () => {
  expect(normalizeBdt(1200.005)).toBe(1200.01);
  expect(paymentProviderFor("COD")).toBe("cash-on-delivery");
  expect(paymentProviderFor("bKash")).toBe("bkash");
  expect(paymentProviderFor("Nagad")).toBe("nagad");
});

test("online payment preparation fails closed while providers are dormant", async ({ request }) => {
  const response = await request.post("/api/payments/prepare", {
    data: { paymentMethod: "bKash" },
  });
  expect(response.status()).toBe(503);
  const body = await response.json();
  expect(body.code).toBe("PAYMENT_PROVIDER_DORMANT");
  expect(body.enabled).toBe(false);
});

test("unsigned CRM settlement events are rejected", async ({ request }) => {
  const response = await request.post("/api/integrations/crm/payment-settlement", {
    data: {
      eventId: "event_test_12345",
      orderNumber: "WEB-TEST-12345678",
      paymentMethod: "COD",
      state: "paid",
      orderTotal: 1000,
    },
  });
  expect(response.status()).toBe(401);
});
