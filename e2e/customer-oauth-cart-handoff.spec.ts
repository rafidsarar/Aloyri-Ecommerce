import { expect, test } from "@playwright/test";

const product = {
  id: "simple-wash",
  name: "Refreshing Facial Wash",
  brand: "Simple",
  size: "150ml",
  category: "Cleanser",
  price: 749,
  active: true,
  availableStock: 12,
};

test("non-destructive cart handoff API rejects invalid input and stays private", async ({ request }) => {
  const empty = await request.get("/api/customer-auth/cart-handoff");
  expect(empty.status()).toBe(200);
  expect(await empty.json()).toEqual({ restored: false, items: [] });
  expect(empty.headers()["cache-control"]).toBe("no-store");

  const wrongType = await request.post("/api/customer-auth/cart-handoff", {
    headers: { "content-type": "text/plain" },
    data: "{}",
  });
  expect(wrongType.status()).toBe(415);

  const invalid = await request.post("/api/customer-auth/cart-handoff", {
    data: { items: [{ productId: "simple-wash", qty: 0 }] },
  });
  expect(invalid.status()).toBe(400);
  const invalidId = await request.post("/api/customer-auth/cart-handoff", {
    data: { items: [{ productId: "../private", qty: 1 }] },
  });
  expect(invalidId.status()).toBe(400);
  const crossOrigin = await request.post("/api/customer-auth/cart-handoff", {
    headers: { origin: "https://untrusted.example" },
    data: { items: [{ productId: "simple-wash", qty: 1 }] },
  });
  expect(crossOrigin.status()).toBe(403);
});

test("guest cart survives emulated full-page Google redirect without local storage", async ({ page }) => {
  await page.route("**/api/catalog", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products: [product], generatedAt: new Date().toISOString() }),
  }));
  let hasSignedIn = false;
  let savedCart: Array<{ productId: string; qty: number }> = [];

  await page.route("**/api/customer-auth/cart-handoff", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = req.postDataJSON() as { items: Array<{ productId: string; qty: number }> };
      savedCart = body.items;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: { "Set-Cookie": "aloyri_cart_oauth_handoff=opaque-test-token; Path=/; HttpOnly; SameSite=Lax" },
        body: JSON.stringify({ saved: true }),
      });
      return;
    }
    const restored = hasSignedIn && savedCart.length > 0;
    await route.fulfill({
      status: restored ? 200 : hasSignedIn ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(restored
        ? { restored: true, items: savedCart }
        : hasSignedIn
          ? { restored: false, items: [] }
          : { error: "Sign in required" }),
    });
    if (restored) savedCart = [];
  });

  // The external OAuth redirect is emulated. It is not a real Google login.
  await page.route("**/api/customer-auth/google/start?**", async (route) => {
    hasSignedIn = true;
    await route.fulfill({
      status: 302,
      headers: { location: "/account" },
      body: "",
    });
  });

  await page.goto("/shop");
  await page.getByRole("button", { name: "Add Refreshing Facial Wash to cart" }).click();
  await expect(page.getByRole("link", { name: "Cart with 1 item" })).toBeVisible();
  await page.getByRole("link", { name: "Cart with 1 item" }).click();
  await page.getByRole("link", { name: /Continue to checkout/ }).click();
  await expect(page).toHaveURL(/\/account\/setup/);

  await page.getByRole("link", { name: "Sign in with Google" }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect.poll(async () =>
    page.getByRole("link", { name: "Cart with 1 item" }).count(),
  ).toBe(1);
  expect(savedCart).toHaveLength(0);

  // Only a short-lived opaque cookie is used, never cart/profile local storage.
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage).filter((key) => key.startsWith("aloyri_")),
    session: Object.keys(sessionStorage).filter((key) => key.startsWith("aloyri_")),
  }));
  expect(stored).toEqual({ local: [], session: [] });
});

test("OAuth handoff fails closed without abandoning guest cart when datastore is unavailable", async ({ page }) => {
  await page.route("**/api/catalog", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products: [product], generatedAt: new Date().toISOString() }),
  }));
  await page.route("**/api/customer-auth/cart-handoff", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ restored: false, items: [] }) }),
  );

  await page.goto("/shop");
  await page.getByRole("button", { name: "Add Refreshing Facial Wash to cart" }).click();
  await page.goto("/account");
  await page.getByRole("link", { name: "Sign in with Google" }).click();
  await expect(page.locator(".account-entry [role=alert]")).toContainText("your cart is still here");
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("link", { name: "Cart with 1 item" })).toBeVisible();
});
