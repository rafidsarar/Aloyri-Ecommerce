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
  await expect(page.getByRole("dialog", { name: "Store navigation menu" })).toBeVisible();
});

test("guest can add products to cart but must sign up before checkout", async ({ page }) => {
  await mockCommerce(page);
  await page.goto("/shop");
  await page.getByRole("link", { name: /Refreshing Facial Wash/i }).click();
  await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await page.getByRole("button", { name: /^Cart with 1 item$/ }).click();
  const drawer = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(drawer.getByText("Refreshing Facial Wash", { exact: true })).toBeVisible();
  await drawer.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(page).toHaveURL(/\/account\/setup/);
  await expect(page.getByRole("heading", { name: "Your account, then checkout." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with Google" })).toBeVisible();
  await page.goto("/track-order");
  await expect(page.getByLabel("Order number")).toBeVisible();
});

test("guest tracking directs return requests to Google sign-in", async ({ page }) => {
  await mockCommerce(page);
  await page.goto("/track-order");
  await page.getByLabel("Order number").fill(delivered.orderNumber);
  await page.getByLabel("Mobile number").fill("01700000000");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByRole("heading", { name: "Delivered" })).toBeVisible();
  await page.getByRole("link", { name: "Request return / refund review" }).click();
  await expect(page).toHaveURL(/account\?section=support/);
  await expect(page.getByRole("link",{name:"Sign in with Google"})).toBeVisible();
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


test("storefront structure keeps shopping and customer tools accessible on mobile", async ({ page }, testInfo) => {
  await mockCommerce(page);
  await page.goto("/shop");
  const filters = page.locator("details").filter({has:page.getByText("Filter by brand, availability & price",{exact:true})});
  await expect(filters).not.toHaveAttribute("open", "");
  await filters.locator("summary").click();
  await page.getByLabel("Brand",{exact:true}).selectOption("Simple");
  await expect(page.getByText("Refreshing Facial Wash",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:/Skin Aqua Super Moisture UV Gel/i})).toHaveCount(0);
  await page.getByRole("button",{name:/Clear .* filters/}).click();
  await expect(page.getByRole("link",{name:/Skin Aqua Super Moisture UV Gel/i})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("shop-desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole("link",{name:"Search products"})).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("shop-mobile.png"),fullPage:true});
  await page.getByRole("button",{name:"Open menu"}).click();
  const menu=page.getByRole("dialog",{name:"Store navigation menu"});
  await expect(menu.getByRole("link",{name:"Search products and brands"})).toHaveAttribute("href","/shop");
  await expect(menu.getByRole("navigation",{name:"Customer tools"})).toHaveCount(0);
  await menu.getByRole("button",{name:"Close menu"}).click();
  await page.getByRole("button",{name:"Account menu"}).click();
  await page.getByRole("navigation",{name:"Account shortcuts"}).getByRole("link",{name:"My account",exact:true}).click();
  await expect(page).toHaveURL(/account/);
  await expect(page.getByRole("navigation",{name:"Account shortcuts"})).toHaveCount(0);
});


test("homepage leads into categories and product details on desktop and mobile", async ({ page },testInfo) => {
  await mockCommerce(page);
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Shop by category"})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("home-desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("home-mobile.png"),fullPage:true});
  const categories = page.locator('[aria-labelledby="shop-by-category"] a[href^="/category/"]');
  await expect(categories.first()).toBeVisible();
  const destination = await categories.first().getAttribute("href");
  await categories.first().click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(destination);
  // Customer product links use the current live catalog, independently of
  // which CRM category happens to be first in the homepage order.
  await page.goto("/shop");
  await expect(page.getByRole("link",{name:/Refreshing Facial Wash/i})).toBeVisible();
  await page.getByRole("link",{name:/Refreshing Facial Wash/i}).first().click();
  await expect(page.getByRole("navigation",{name:"Product information"})).toBeVisible();
  await page.getByRole("link",{name:"Customer reviews",exact:true}).click();
  await expect(page).toHaveURL(/#reviews$/);
  await page.screenshot({path:testInfo.outputPath("product-mobile.png"),fullPage:true});
});
