import { expect, test, type Page } from "@playwright/test";

const products = [
  { id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", category: "Cleanser", price: 749, active: true, availableStock: 12 },
  { id: "skin-aqua", name: "Skin Aqua Super Moisture UV Gel", brand: "Rohto", size: "110g · SPF50+ PA++++", category: "Sunscreen", price: 1350, active: true, availableStock: 7 },
];

const delivered = {
  orderNumber: "WEB-E2E-ORDER-0001",
  created: "2026-10-01",
  status: "Delivered",
  paymentMethod: "COD",
  items: [{ name: "Refreshing Facial Wash", brand: "Simple", size: "150ml", qty: 1, unitPrice: 749 }],
  productsSubtotal: 749,
  discount: 0,
  deliveryCharge: 80,
  total: 829,
  trackingReference: "E2E-TRACK-1",
  deliveredDate: "2026-10-04",
  returnedDate: "",
};

async function mockCommerce(page: Page) {
  await page.route("**/_next/image?**", (route) =>
    route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg'/>" }),
  );
  await page.route("**/api/catalog", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products, generatedAt: "2026-10-06T00:00:00.000Z" }) }),
  );
  await page.route("**/api/store-status", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orderingEnabled: true, paymentMethods: ["COD"], deliveryRates: { "inside-dhaka": 80, "outside-dhaka": 150 } }) }),
  );
  await page.route("**/api/promotions/quote", async (route) => {
    const request = route.request().postDataJSON() as { items: Array<{ productId: string; qty: number }>; deliveryZone?: string };
    const subtotal = request.items.reduce((sum, item) => sum + (products.find((p) => p.id === item.productId)?.price || 0) * item.qty, 0);
    const delivery = request.deliveryZone === "outside-dhaka" ? 150 : request.deliveryZone ? 80 : 0;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ productsSubtotal: subtotal, discount: 0, discountedSubtotal: subtotal, deliveryChargeBeforeDiscount: delivery, shippingDiscount: 0, deliveryCharge: delivery, total: subtotal + delivery, savings: 0, requestedCode: "", codeApplied: false, promotion: null }),
    });
  });
  await page.route("**/api/orders", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ orderNumber: delivered.orderNumber, deliveryCharge: 77, total: 777 }) }),
  );
  await page.route("**/api/track-order", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(delivered) }),
  );
  await page.route("**/api/return-request", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ requestId: "RET-E2E-0001", orderNumber: delivered.orderNumber, status: "Pending review", duplicate: false }) }),
  );
}

test("catalog search and mobile navigation", async ({ page }) => {
  await mockCommerce(page);
  await page.goto("/shop");
  await expect(page.getByText("Refreshing Facial Wash")).toBeVisible();
  await page.getByPlaceholder("Search products, brands, routines or textures").fill("Skin Aqua");
  await expect(
    page.getByRole("link", { name: /Skin Aqua Super Moisture UV Gel/i }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();
});

test("COD checkout confirms the CRM-authoritative final total", async ({ page }) => {
  await mockCommerce(page);
  await page.addInitScript(() => {
    localStorage.setItem("aloyri_cart", JSON.stringify([{ productId: "simple-wash", qty: 1 }]));
  });
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Aloyri E2E Customer");
  await page.getByLabel("Mobile number").fill("01700000000");
  await page.getByRole("button", { name: /Inside Dhaka/ }).click();
  await page.getByLabel("District").selectOption("Dhaka");
  await page.getByLabel("Area / thana / upazila").fill("Dhanmondi");
  await page.getByLabel("Full delivery address").fill("House 1, Road 2, Dhanmondi, Dhaka");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.getByRole("button", { name: /Place COD order/ }).click();

  await expect(page).toHaveURL(/order-confirmation/);
  await expect(page.getByText(delivered.orderNumber)).toBeVisible();
  await expect(page.getByText(/777/)).toBeVisible();
});

test("tracking can continue into a return request", async ({ page }) => {
  await mockCommerce(page);
  await page.goto("/track-order");
  await page.getByLabel("Order number").fill(delivered.orderNumber);
  await page.getByLabel("Mobile number").fill("01700000000");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByRole("heading", { name: "Delivered" })).toBeVisible();
  await page.getByRole("link", { name: "Request return / refund review" }).click();
  await expect(page).toHaveURL(/\/return-request\?order=/);
  await page.getByLabel("Mobile number").fill("01700000000");
  await expect(page.getByLabel("Mobile number")).toHaveValue("01700000000");
  await page.getByRole("button", { name: "Verify order" }).click();
  await page.getByLabel("Return quantity for Refreshing Facial Wash").selectOption("1");
  await page.getByRole("button", { name: "Submit return request" }).click();
  await expect(page.getByText("RET-E2E-0001")).toBeVisible();
});

test("security headers, noindex and API content-type boundary", async ({ page, request }) => {
  const response = await request.get("/checkout");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");

  const invalid = await request.post("/api/orders", { headers: { "content-type": "text/plain" }, data: "{}" });
  expect(invalid.status()).toBe(415);

  await page.goto("/cart");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
});
