import { expect, test } from "@playwright/test";
import {
  suggestedSupportPriority,
  supportCaseIntelligence,
} from "../src/lib/support-case-model";

test("support intelligence prioritizes customer-impacting exceptions", () => {
  expect(
    suggestedSupportPriority({
      category: "refund",
      preferredResolution: "Refund",
    }),
  ).toBe("high");
  expect(
    suggestedSupportPriority({
      category: "return",
      reason: "Damaged on arrival",
    }),
  ).toBe("high");

  const intelligence = supportCaseIntelligence({
    createdAt: new Date().toISOString(),
    status: "reviewing",
    category: "refund",
    preferredResolution: "Refund",
    paymentState: "paid",
    refundState: "requested",
    paymentReconciliation: "matched",
    shipmentState: "delivery_failed",
    shipmentReconciliation: "attention",
    codState: "attention",
  });

  expect(intelligence.level).toBe("attention");
  expect(intelligence.signals.map((signal) => signal.key)).toEqual(
    expect.arrayContaining([
      "refund-awaiting-settlement",
      "refund-in-progress",
      "delivery-exception",
      "reconciliation",
    ]),
  );
});

test("invalid support requests fail without creating customer data", async ({
  request,
}) => {
  const response = await request.post("/api/support-request", {
    data: {
      customerName: "",
      phone: "123",
      category: "payment",
      note: "",
    },
  });
  expect(response.status()).toBe(401);
});

test("invalid return requests remain fail-closed", async ({ request }) => {
  const response = await request.post("/api/return-request", {
    data: {
      orderNumber: "invalid",
      phone: "123",
      reason: "Other",
      condition: "Other",
      preferredResolution: "Refund",
      note: "test",
      items: [{ line: 0, qty: 1 }],
    },
  });
  expect(response.status()).toBe(401);
});

test("customer service admin remains authenticated", async ({ request }) => {
  const response = await request.get("/admin/customer-service", {
    maxRedirects: 0,
  });
  expect([302, 303, 307, 308]).toContain(response.status());
  expect(response.headers()["location"]).toContain("/admin/login");
});

test("store status exposes datastore readiness without secrets", async ({
  request,
}) => {
  const response = await request.get("/api/store-status");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.datastore).toEqual(
    expect.objectContaining({
      configured: expect.any(Boolean),
      reachable: expect.any(Boolean),
      namespace: expect.any(String),
      recordCount: expect.any(Number),
      migrationState: expect.any(String),
    }),
  );
  expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
  expect(JSON.stringify(body)).not.toContain("POSTGRES_PASSWORD");
});


test("framework rendering signals do not hide real CRM incidents", async () => {
  const { isHistoricalRenderSignal } = await import("../src/lib/runtime-error-utils");
  const message = "Dynamic server usage: Route /product/[slug] couldn't be rendered statically because it used no-store fetch [url] /product/[slug].";
  expect(isHistoricalRenderSignal({source:"crm.catalog",message})).toBe(true);
  expect(isHistoricalRenderSignal({source:"crm.catalog",message:message.replace("no-store", "revalidate: 0")})).toBe(true);
  expect(isHistoricalRenderSignal({source:"crm.catalog",message:"CRM request timed out"})).toBe(false);
  expect(isHistoricalRenderSignal({source:"analytics",message})).toBe(false);
});
