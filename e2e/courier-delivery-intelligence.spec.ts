import { expect, test } from "@playwright/test";
import {
  canTransitionShipment,
  codReconciliation,
  courierCodState,
  shipmentStateFromCrmStatus,
  validCourierCodAmounts,
} from "../src/lib/courier-shipment-model";

test("shipment state machine protects delivery and RTO transitions", () => {
  expect(canTransitionShipment("awaiting_fulfillment", "ready_for_courier")).toBe(true);
  expect(canTransitionShipment("ready_for_courier", "in_transit")).toBe(true);
  expect(canTransitionShipment("out_for_delivery", "delivery_failed")).toBe(true);
  expect(canTransitionShipment("delivery_failed", "reattempt_scheduled")).toBe(true);
  expect(canTransitionShipment("delivery_failed", "return_to_origin")).toBe(true);
  expect(canTransitionShipment("return_to_origin", "returned_to_origin")).toBe(true);
  expect(canTransitionShipment("delivered", "in_transit")).toBe(false);
  expect(canTransitionShipment("returned_to_origin", "out_for_delivery")).toBe(false);
});

test("CRM order states map only to safe shipment milestones", () => {
  expect(shipmentStateFromCrmStatus("Packed")).toBe("ready_for_courier");
  expect(shipmentStateFromCrmStatus("Shipped")).toBe("in_transit");
  expect(shipmentStateFromCrmStatus("Out for delivery")).toBe("out_for_delivery");
  expect(shipmentStateFromCrmStatus("Delivered")).toBe("delivered");
  expect(shipmentStateFromCrmStatus("Returned")).toBe(null);
});

test("COD courier amounts cannot over-collect or over-remit", () => {
  expect(validCourierCodAmounts(1500, 1500, 1500)).toBe(true);
  expect(validCourierCodAmounts(1500, 1500, 1200)).toBe(true);
  expect(validCourierCodAmounts(1500, 1600, 1500)).toBe(false);
  expect(validCourierCodAmounts(1500, 1000, 1200)).toBe(false);
  expect(courierCodState({ isCod: true, expectedAmount: 1500, collectedAmount: 1500, remittedAmount: 0 })).toBe("remittance_pending");
  expect(courierCodState({ isCod: true, expectedAmount: 1500, collectedAmount: 1500, remittedAmount: 1500 })).toBe("remitted");
});

test("COD reconciliation requires both courier remittance and CRM paid settlement", () => {
  expect(codReconciliation({
    isCod: true,
    expectedAmount: 1500,
    collectedAmount: 1500,
    remittedAmount: 1500,
    paymentSettlementState: "paid",
  }).state).toBe("matched");
  expect(codReconciliation({
    isCod: true,
    expectedAmount: 1500,
    collectedAmount: 1500,
    remittedAmount: 1500,
    paymentSettlementState: "pending",
  }).state).toBe("attention");
  expect(codReconciliation({
    isCod: true,
    expectedAmount: 1500,
    collectedAmount: 1500,
    remittedAmount: 0,
    paymentSettlementState: "paid",
  }).state).toBe("attention");
});

test("direct courier booking stays fail-closed", async ({ request }) => {
  const response = await request.post("/api/courier/prepare", {
    data: { provider: "pathao" },
  });
  expect(response.status()).toBe(503);
  const body = await response.json();
  expect(body.code).toBe("COURIER_PROVIDER_DORMANT");
  expect(body.enabled).toBe(false);
});

test("unsigned CRM courier events are rejected", async ({ request }) => {
  const response = await request.post("/api/integrations/crm/courier-shipment", {
    data: {
      eventId: "courier_test_12345",
      orderNumber: "WEB-TEST-12345678",
      orderTotal: 1000,
      paymentMethod: "COD",
      provider: "pathao",
      state: "in_transit",
    },
  });
  expect(response.status()).toBe(401);
});
