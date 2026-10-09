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
      try { return (await fetch(`${base}/admin/builder`)).status; } catch { return 0; }
    }, { timeout: 100_000 }).toBe(200);
  });
  test.afterAll(() => fixture?.kill("SIGTERM"));

  test("desktop navigation shows current page and searches sections", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`${base}/admin/builder`);
    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav.getByRole("link", { name: "Storefront Builder", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("searchbox", { name: "Find an admin section" }).fill("payments");
    await expect(nav.getByRole("link", { name: "Payments", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Storefront Builder", exact: true })).toHaveCount(0);
    await page.getByRole("searchbox").fill("");
    await page.screenshot({ path: testInfo.outputPath("admin-desktop.png"), fullPage: true });
    await page.goto(`${base}/admin/products/item`);
    await expect(nav.getByRole("link", { name: "Products", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("mobile menu opens without horizontal page overflow", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/admin/builder`);
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
  test("visual builder adds, edits, reorders and undoes components without saving", async ({ page }, testInfo) => {
    await page.goto(`${base}/admin/builder`);
    await expect(page.getByRole("heading", { name: "Visual Builder preview" })).toBeVisible();
    await page.getByRole("button", { name: "Unsaved layout & components" }).click();
    await page.getByRole("button", { name: /Text & heading/ }).click();
    await page.getByRole("textbox", { name: "Heading", exact: true }).fill("Our Aloyri story");
    await expect(page.getByRole("heading", { name: "Our Aloyri story" })).toBeVisible();
    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.locator("[data-visual-block]")).toHaveCount(2);
    await page.getByRole("button", { name: /Undo/ }).click();
    await expect(page.locator("[data-visual-block]")).toHaveCount(1);
    await page.getByRole("button", { name: /mobile/ }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("visual-builder-mobile.png"), fullPage: true });
  });

  test("desktop preview fits its Admin canvas at native desktop breakpoints", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/admin/builder`);
    await expect(page.locator("[data-builder-preview-host]")).toBeVisible();
    await expect.poll(async () => page.locator("[data-builder-preview-host]").evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(300);
    const initial = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>("[data-builder-preview-host]")!;
      const frame = host.querySelector<HTMLIFrameElement>("iframe")!;
      return {
        viewportWidth: frame.clientWidth,
        visibleWidth: frame.getBoundingClientRect().width,
        hostWidth: host.getBoundingClientRect().width,
        hostRight: host.getBoundingClientRect().right,
        frameRight: frame.getBoundingClientRect().right,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(initial.viewportWidth).toBe(1060);
    expect(initial.visibleWidth).toBeLessThanOrEqual(initial.hostWidth + 2);
    expect(initial.frameRight).toBeLessThanOrEqual(initial.hostRight + 2);
    expect(initial.pageOverflow).toBe(false);

    await page.getByRole("button", { name: "Focus preview" }).click();
    await expect(page.locator(".builder-properties")).toBeHidden();
    await expect.poll(() => page.locator("[data-builder-preview-host]").evaluate(element => element.clientWidth)).toBeGreaterThan(initial.hostWidth);
    await page.getByRole("button", { name: "Show editing panels" }).click();
    await expect(page.locator(".builder-properties")).toBeVisible();
  });

  test("tablet and mobile device previews stay inside the canvas", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/admin/builder`);
    for (const [name, nativeWidth] of [["mobile", 390], ["tablet", 768], ["desktop", 1060]] as const) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect.poll(async () => page.locator("[data-builder-preview-host] iframe").evaluate(frame => (frame as HTMLIFrameElement).clientWidth)).toBe(nativeWidth);
      await expect.poll(async () => page.evaluate(() => {
        const host = document.querySelector<HTMLElement>("[data-builder-preview-host]")!;
        const frame = host.querySelector("iframe")!;
        return frame.getBoundingClientRect().right <= host.getBoundingClientRect().right + 2;
      })).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
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

  test("admin customization fields are labeled and fit a narrow screen",async({page},testInfo)=>{
    await page.goto(`${base}/admin/settings`);
    await page.getByLabel("Page width").selectOption("comfortable");
    await page.getByLabel("Products per row on desktop").selectOption("3");
    await page.getByLabel("Menu item 1 label").fill("Browse skincare");
    await page.getByLabel("Show announcement bar").uncheck();
    await expect(page.getByLabel("Menu item 1 label")).toHaveValue("Browse skincare");
    await page.screenshot({path:testInfo.outputPath("customization-desktop.png"),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath("customization-mobile.png"),fullPage:true});
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
    page.on("pageerror",error=>console.log("CHECKOUT UI ERROR:",error.message));
    await mockCheckoutApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/test-cart`);
    await page.getByRole("button", { name: "Start fixture checkout" }).click();
    const detailsHeading = page.getByRole("heading", { name: "Delivery details." });
    try {
      await expect(detailsHeading).toBeVisible({ timeout: 12_000 });
    } catch (error) {
      const visiblePage = await page.locator("body").innerText().catch(() => "(body inaccessible)");
      console.log("ISOLATED CHECKOUT DIAGNOSTIC:", visiblePage.slice(0, 2500));
      throw error;
    }
    await expect(page.getByRole("combobox", { name: /^Saved address/ })).toHaveValue("");
    await expect(page.getByRole("combobox", { name: /^District/ })).toHaveValue("");

    const preview = page.getByText("View order summary");
    await expect(preview).toBeVisible();
    await page.locator(".checkout-mobile-summary summary").click();
    await expect(page.locator(".checkout-mobile-summary")).toContainText("699");

    await page.getByRole("combobox", { name: /^Saved address/ }).selectOption("saved-home");
    await expect(page.getByRole("combobox", { name: /^District/ })).toHaveValue("Dhaka");
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
    await page.getByRole("combobox", { name: /^District/ }).selectOption("Dhaka");
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

  test("promotion retry recovers the same code and repeated apply stays usable", async ({ page }) => {
    await mockCheckoutApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    let codeRequests = 0;
    await page.route("**/api/promotions/quote", async route => {
      const { code, deliveryZone } = route.request().postDataJSON();
      if (code) codeRequests += 1;
      if (code && codeRequests === 1) {
        await route.fulfill({ status: 503, json: { error: "Promotion service temporarily unavailable." } });
        return;
      }
      const shipping = deliveryZone === "inside-dhaka" ? 80 : 0;
      await route.fulfill({ json: {
        productsSubtotal: 699, discount: code ? 70 : 0, discountedSubtotal: code ? 629 : 699,
        deliveryChargeBeforeDiscount: shipping, shippingDiscount: 0, deliveryCharge: shipping,
        total: (code ? 629 : 699) + shipping, savings: code ? 70 : 0,
        requestedCode: code || "", codeApplied: Boolean(code),
        promotion: code ? { id: "save10", name: "Save ten", badgeText: "SAVE10" } : null,
      } });
    });
    await page.goto(`${base}/checkout`);
    await page.getByRole("combobox", { name: /^Saved address/ }).selectOption("saved-home");
    const review = page.getByRole("button", { name: "Review order" });
    await expect(review).toBeEnabled();
    await page.getByRole("textbox", { name: "Promotion code" }).fill("SAVE10");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.getByText("Promotion service temporarily unavailable.")).toBeVisible();
    await expect(review).toBeDisabled();
    // Applying the unchanged code must actually make a new request.
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(review).toBeEnabled();
    expect(codeRequests).toBe(2);
    await expect(page.getByText(/70 saved on this order/)).toBeVisible();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(review).toBeEnabled();
    expect(codeRequests).toBe(3);
    await review.click();
    await expect(page.getByRole("button", { name: /Place COD/ })).toContainText("709");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("editing saved recipient details switches to manual delivery without losing the address", async ({ page }) => {
    await mockCheckoutApi(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`${base}/checkout`);
    const saved = page.getByRole("combobox", { name: /^Saved address/ });
    await saved.selectOption("saved-home");
    await page.getByLabel(/^Full name/).fill("Another Recipient");
    await expect(saved).toHaveValue("");
    await expect(page.getByLabel("Full delivery address")).toHaveValue("House 12, Road 9, Dhanmondi, Dhaka");
    await saved.selectOption("saved-home");
    await page.locator('[data-checkout-field="phone"]').fill("01812345678");
    await expect(saved).toHaveValue("");
    await expect(page.getByRole("combobox", { name: /^District/ })).toHaveValue("Dhaka");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("cart recovery accepts a valid account email only after explicit consent", async ({ page }) => {
    await mockCheckoutApi(page);
    await page.route("**/api/cart-recovery/status", route => route.fulfill({ json: { enabled: true } }));
    const captures: unknown[] = [];
    await page.route("**/api/cart-recovery", route => {
      captures.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto(`${base}/checkout`);
    const consent = page.getByRole("checkbox", { name: /Email me one secure link/ });
    await expect(consent).not.toBeChecked();
    expect(captures).toHaveLength(0);
    await consent.check();
    await expect.poll(() => captures.length).toBe(1);
    expect(captures[0]).toMatchObject({ consent: true, email: "customer@example.test", items: [{ productId: "simple-wash", qty: 1 }] });
  });

  test("rejected promotion can be retried explicitly or removed without trapping checkout", async ({ page }) => {
    await mockCheckoutApi(page);
    await page.setViewportSize({ width: 320, height: 700 });
    let rejectedRequests = 0;
    await page.route("**/api/promotions/quote", async route => {
      const { code } = route.request().postDataJSON();
      if (!code) { await route.fallback(); return; }
      rejectedRequests += 1;
      await route.fulfill({ status: 400, json: { error: "This code is not eligible." } });
    });
    await page.goto(`${base}/checkout`);
    const review = page.getByRole("button", { name: "Review order" });
    await expect(review).toBeEnabled();
    await page.getByRole("textbox", { name: "Promotion code" }).fill("BAD");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.getByText("This code is not eligible.")).toBeVisible();
    await expect(review).toBeDisabled();
    await page.getByRole("button", { name: "Retry code", exact: true }).click();
    await expect(page.getByText("This code is not eligible.")).toBeVisible();
    expect(rejectedRequests).toBe(2);
    await page.getByRole("button", { name: "Remove code and continue" }).click();
    await expect(review).toBeEnabled();
    await expect(page.getByRole("textbox", { name: "Promotion code" })).toHaveValue("");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

});
