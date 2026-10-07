import { expect, test } from "@playwright/test";

test("CRM sync hardening keeps customer-safe catalog available", async ({ request }) => {
  const response = await request.get("/api/catalog");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body.products)).toBeTruthy();
  for (const product of body.products) {
    expect(product).not.toHaveProperty("cost");
    expect(product).not.toHaveProperty("supplierId");
    expect(product).not.toHaveProperty("batchId");
  }
});

test("operations reconciliation stays behind admin authentication", async ({ page }) => {
  await page.goto("/admin/operations");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("invalid order remains non-persisting while bridge is hardened", async ({ request }) => {
  const externalOrderId = "HARDENING-" + Date.now();
  const response = await request.post("/api/orders", {
    data: {
      externalOrderId,
      customer: {
        name: "Aloyri Sync Hardening Test",
        phone: "01700000000",
        address: "Non-persisting hardening test address",
        district: "Dhaka",
        area: "Test",
      },
      items: [{ productId: "aloyri-missing-hardening-product", qty: 1 }],
      deliveryZone: "inside-dhaka",
      paymentMethod: "COD",
    },
  });
  expect(response.status()).toBe(409);
  const body = await response.json();
  expect(body.code).toBe("PRODUCT_UNAVAILABLE");
});
