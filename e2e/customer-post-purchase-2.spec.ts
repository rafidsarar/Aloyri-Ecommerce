import { expect, test } from "@playwright/test";

test.describe("customer post-purchase account", () => {
  test("account center remains available", async ({ page }) => {
    const response = await page.goto("/account");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Welcome to your account." })).toBeVisible();
  });

  test("secure customer APIs fail closed without a session", async ({ request }) => {
    const postPurchase = await request.get("/api/customer/post-purchase");
    expect(postPurchase.status()).toBe(401);

    const security = await request.get("/api/customer/security");
    expect(security.status()).toBe(401);

    const invoice = await request.get("/api/customer/order-invoice?order=WEB-TEST-12345678");
    expect(invoice.status()).toBe(401);

    const summary = await request.get("/api/customer/order-summary?order=WEB-TEST-12345678");
    expect(summary.status()).toBe(401);

    const action = await request.post("/api/customer/post-purchase/action", {
      data: { action: "cancellation", orderNumber: "WEB-TEST-12345678" },
    });
    expect(action.status()).toBe(401);
  });
});
