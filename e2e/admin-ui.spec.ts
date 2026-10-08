import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";

test.describe("minimal admin interface", () => {
  test.describe.configure({ mode: "serial" });
  let fixture: ChildProcess;
  let base: string;
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    const port = 3100 + testInfo.workerIndex;
    base = `http://127.0.0.1:${port}`;
    fixture = spawn(process.execPath, ["scripts/admin-ui-fixture.cjs", String(port)], { stdio: "pipe" });
    let logs = "";
    fixture.stdout?.on("data", data => { logs += data; });
    fixture.stderr?.on("data", data => { logs += data; });
    await expect.poll(async () => {
      if (fixture.exitCode !== null) throw new Error(logs);
      try { return (await fetch(`${base}/admin/homepage`)).status; } catch { return 0; }
    }, { timeout: 100_000 }).toBe(200);
  });
  test.afterAll(() => fixture?.kill("SIGTERM"));

  test("desktop navigation shows current page and searches sections", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`${base}/admin/homepage`);
    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav.getByRole("link", { name: "Homepage Builder", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("searchbox", { name: "Find an admin section" }).fill("payments");
    await expect(nav.getByRole("link", { name: "Payments", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Homepage Builder", exact: true })).toHaveCount(0);
    await page.getByRole("searchbox").fill("");
    await page.screenshot({ path: testInfo.outputPath("admin-desktop.png"), fullPage: true });
    await page.goto(`${base}/admin/products/item`);
    await expect(nav.getByRole("link", { name: "Products", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("mobile menu opens without horizontal page overflow", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/admin/homepage`);
    const toggle = page.getByRole("button", { name: /Browse sections/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
    await page.getByRole("searchbox").fill("missing section");
    await expect(page.getByText("No sections found.")).toBeVisible();
    await page.getByRole("searchbox").fill("");
    await page.getByRole("button", { name: /Close menu/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("admin-mobile.png"), fullPage: true });
  });
  test("account sections keep orders, addresses and support in one responsive area",async({page},testInfo)=>{
    const account={email:"customer@example.test",displayName:"Preview customer",savedAddresses:[],savedProductIds:[],emailPreferences:{postDelivery:false,reviewRequest:false,reorderReminder:false}};
    await page.route("**/api/customer/post-purchase*",route=>route.fulfill({json:{account,orders:[{ok:true,phone:"01700000000",canRequestCancellation:false,canReportDeliveryIssue:false,canRequestReturn:false,order:{orderNumber:"WEB-PREVIEW-12345678",created:"2026-10-08",status:"Confirmed",total:829,items:[{name:"Cleanser",brand:"Simple",size:"150ml",qty:1,unitPrice:749}]}}],pagination:{page:1,pages:1,total:1},supportCases:[],productAlerts:[]}}));
    await page.route("**/api/customer/security",route=>route.fulfill({json:{activeSessions:1,currentSessionCreatedAt:"2026-10-08",currentSessionExpiresAt:"2026-10-09"}}));
    await page.route("**/api/customer-auth/status",route=>route.fulfill({json:{enabled:true,authenticated:true,account}}));
    await page.setViewportSize({width:1440,height:960});
    await page.goto(`${base}/account`);
    await expect(page.getByRole("heading",{name:"Your orders"})).toBeVisible();
    await expect(page.getByText("WEB-PREVIEW-12345678")).toBeVisible();
    await page.screenshot({path:testInfo.outputPath("account-desktop.png"),fullPage:true});
    await page.getByRole("button",{name:"Addresses",exact:true}).click();
    await expect(page.getByLabel("Recipient name")).toBeVisible();
    await expect(page.getByText("WEB-PREVIEW-12345678")).toHaveCount(0);
    await page.getByRole("button",{name:"Support",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Support & returns"})).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath("account-mobile.png"),fullPage:true});
  });

  async function mockCheckoutApi(page: import("@playwright/test").Page, includeSavedAddress = true) {
    const account = {
      id: "checkout-fixture", email: "customer@example.test", displayName: "Test Customer",
      phone: "01712345678",
      savedAddresses: includeSavedAddress ? [{
        id: "saved-home", label: "Home", recipientName: "Test Customer",
        phone: "01712345678", district: "Dhaka", area: "Dhanmondi",
        address: "House 12, Road 9, Dhanmondi, Dhaka",
        landmark: "Near the park",
      }] : [],
    };
    await page.route("**/api/catalog", route => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ generatedAt: new Date().toISOString(), products: [{
        id: "simple-wash", name: "Refreshing Facial Wash", brand: "Simple",
        category: "Cleanser", size: "150ml", price: 749, salePrice: 699,
        availableStock: 5, active: true,
      }] }),
    }));
    await page.route("**/api/customer-auth/status", route => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ enabled: true, authenticated: true, authMethod: "google", account }),
    }));
    await page.route("**/api/store-status", route => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        orderingEnabled: true, paymentMethods: ["COD"],
        deliveryRates: { "inside-dhaka": 80, "outside-dhaka": 150 },
      }),
    }));
    await page.route("**/api/promotions/quote", async route => {
      const body = route.request().postDataJSON() as {deliveryZone?:string};
      const shipping = body.deliveryZone === "inside-dhaka" ? 80 : body.deliveryZone === "outside-dhaka" ? 150 : 0;
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          productsSubtotal: 699, discount: 0, discountedSubtotal: 699,
          deliveryChargeBeforeDiscount: shipping, shippingDiscount: 0,
          deliveryCharge: shipping, total: 699 + shipping,
          savings: 50, requestedCode: "", codeApplied: false, promotion: null,
        }),
      });
    });
    await page.route("**/api/cart-recovery/status", route => route.fulfill({
      status: 200, contentType: "application/json", body: '{"enabled":false}',
    }));
  }

  test("real checkout component offers selectable saved address and sale-price review on mobile", async ({ page }) => {
    test.setTimeout(90_000);
    await mockCheckoutApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    // Precompile checkout outside the browser so no empty-cart React route is cached.
    const warmed = await page.request.get(`${base}/checkout`, { timeout: 45_000 });
    expect(warmed.ok()).toBe(true);
    await page.goto(`${base}/test-cart`);
    await page.getByRole("button", { name: "Start fixture checkout" }).click();
    await expect(page.getByRole("heading", { name: "Delivery details." })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Saved address")).toHaveValue("");
    await expect(page.getByLabel("District")).toHaveValue("");

    const preview = page.getByText("View order summary");
    await expect(preview).toBeVisible();
    await page.locator(".checkout-mobile-summary summary").click();
    await expect(page.locator(".checkout-mobile-summary")).toContainText("699");

    await page.getByLabel("Saved address").selectOption("saved-home");
    await expect(page.getByLabel("District")).toHaveValue("Dhaka");
    await expect(page.getByRole("button", { name: /Inside Dhaka/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("checkbox", { name: /Save this address to my account/ })).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Review order" })).toBeEnabled();
    await page.getByRole("button", { name: "Review order" }).click();
    await expect(page.getByRole("heading", { name: "Review everything." })).toBeVisible();
    await expect(page.getByText("Cash due")).toBeVisible();
    await expect(page.getByRole("button", { name: /Place COD/ })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("checkout highlights missing fields, suggests district zone and preserves idempotent COD order", async ({ page }) => {
    await mockCheckoutApi(page, false);
    await page.setViewportSize({ width: 320, height: 700 });
    let orderCalls = 0;
    await page.route("**/api/orders", route => {
      orderCalls += 1;
      return route.fulfill({
        status: 201, contentType: "application/json",
        body: JSON.stringify({ orderNumber: "WEB-FIXTURE-12345678", deliveryCharge: 80, total: 779 }),
      });
    });
    await page.goto(`${base}/test-cart`);
    await page.getByRole("button", { name: "Start fixture checkout" }).click();
    const review = page.getByRole("button", { name: "Review order" });
    await expect(review).toBeEnabled();
    await review.click();
    await expect(page.getByText("Please check your delivery details.")).toBeVisible();
    await page.getByLabel("District").selectOption("Dhaka");
    await expect(page.getByRole("button", { name: /Inside Dhaka/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Area / thana / upazila").fill("Dhanmondi");
    await page.getByLabel("Full delivery address").fill("House 12, Road 9, Dhanmondi, Dhaka");
    await review.click();
    await expect(page.getByRole("heading", { name: "Review everything." })).toBeVisible();
    await page.getByRole("button", { name: /Place COD/ }).click();
    await expect(page).toHaveURL(/\/account\?checkout=complete&order=WEB-FIXTURE-12345678/);
    expect(orderCalls).toBe(1);
    expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("aloyri_")))).toEqual([]);
  });

});
