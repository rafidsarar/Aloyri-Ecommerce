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
    await expect(nav.getByRole("link", { name: "Homepage", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("searchbox", { name: "Find an admin section" }).fill("products");
    await expect(nav.getByRole("link", { name: "Products", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Homepage", exact: true })).toHaveCount(0);
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
  test("Owner website control coverage is accessible and read-only on desktop and mobile", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 860 });
      await page.goto(`${base}/admin/dashboard`);
      const guideLink = page.getByRole("link", { name: /Website control guide/ });
      await expect(guideLink).toHaveAttribute("href", "/admin/controls");
      await guideLink.click();
      await expect(page.getByRole("heading", { name: "Website control guide" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Managed in Aloyri CRM" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Still requires development" })).toBeVisible();
      await expect(page.locator("#admin-content form")).toHaveCount(0);
      await expect(page.getByRole("link", { name: /Search and discovery/ })).toHaveAttribute(
        "href",
        "/admin/merchandising/discovery",
      );
      await expect(page.getByRole("link", { name: /Recommendations/ })).toHaveAttribute(
        "href",
        "/admin/merchandising/recommendations",
      );
      await expect(page.getByText(/staff-management interface/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });
  test("visual builder adds, edits, reorders and undoes components without saving", async ({ page }, testInfo) => {
    await page.goto(`${base}/admin/builder`);
    await expect(page.getByRole("heading", { name: "Visual Builder preview" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Feature cards/ })).toHaveCount(0);
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
    await expect.poll(() => page.evaluate(() => {
      const host = document.querySelector<HTMLElement>("[data-builder-preview-host]")!;
      const frame = host.querySelector("iframe")!;
      return frame.getBoundingClientRect().right <= host.getBoundingClientRect().right + 2;
    })).toBe(true);
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
    expect(initial.viewportWidth).toBe(1280);
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
    for (const [name, nativeWidth] of [["mobile", 390], ["tablet", 820], ["desktop", 1280]] as const) {
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
    await page.getByRole("navigation",{name:"Account sections"}).getByRole("button",{name:"Saved addresses",exact:true}).click();
    await expect(page.getByLabel("Recipient name")).toBeVisible();
    await expect(page.getByText("WEB-PREVIEW-12345678")).toHaveCount(0);
    await page.getByRole("navigation",{name:"Account sections"}).getByRole("button",{name:"Customer care",exact:true}).click();
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

test.describe('Owner administration editing safeguards', () => {
  let fixture: ChildProcess;
  let base: string;
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    base = `http://127.0.0.1:${3300 + testInfo.workerIndex}`;
    fixture = spawn(process.execPath, ['scripts/admin-ui-fixture.cjs', String(3300 + testInfo.workerIndex)], {stdio:'pipe'});
    let logs = ''; fixture.stdout?.on('data', data => {logs += data;}); fixture.stderr?.on('data', data => {logs += data;});
    await expect.poll(async () => {
      if (fixture.exitCode !== null) throw new Error(logs);
      try {return (await fetch(`${base}/admin/builder`)).status;} catch {return 0;}
    }, {timeout:100_000}).toBe(200);
  });
  test.afterAll(() => fixture?.kill('SIGTERM'));
  test('Owner navigation omits Team; forms retain their opening version and warn on unsaved navigation', async ({page}) => {
    await page.goto(`${base}/admin/settings`);
    await expect(page.getByRole('navigation', {name:'Admin navigation'}).getByRole('link',{name:'Team',exact:true})).toHaveCount(0);
    const token = page.locator('form input[name="storefrontVersion"]');
    await expect(token).toHaveValue('2026-10-11T00:00:00.000Z');
    const control = page.locator('form select').first();
    const value = await control.inputValue();
    const options = await control.locator('option').evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value));
    await control.selectOption(options.find(option => option !== value)!);
    await expect(page.getByRole('status').filter({hasText:'Unsaved changes'})).toBeVisible();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('navigation',{name:'Admin navigation'}).getByRole('link',{name:'Overview',exact:true}).click();
    await expect(page).toHaveURL(`${base}/admin/settings`);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('navigation',{name:'Admin navigation'}).getByRole('link',{name:'Homepage',exact:true}).click();
    await expect(page).toHaveURL(`${base}/admin/homepage`);
  });
  test('Simple homepage opens the banner first and submits values from closed sections', async ({page}, testInfo) => {
    await page.goto(`${base}/admin/website`);
    await expect(page.locator('#home-hero')).toHaveAttribute('open','');
    await expect(page.locator('#home-layout')).not.toHaveAttribute('open','');
    await expect(page.getByRole('button',{name:'Save homepage',exact:true})).toBeVisible();
    await page.locator('textarea[name="headline"]').fill('A simpler daily routine');
    await page.locator('select[name="heroImagePath"]').selectOption('media/fixture-banner.webp');
    await expect(page.getByAltText('Selected banner image')).toBeVisible();
    await page.locator('#home-story > summary').click();
    await page.locator('input[name="ideaHeadline"]').fill('Care made simple');
    await expect(page.locator('#home-hero')).not.toHaveAttribute('open','');
    const submitted = await page.locator('#admin-content form').evaluate(form => Object.fromEntries(new FormData(form as HTMLFormElement)));
    expect(submitted.headline).toBe('A simpler daily routine');
    expect(submitted.ideaHeadline).toBe('Care made simple');
    expect(submitted.heroImagePath).toBe('media/fixture-banner.webp');
    expect(JSON.parse(String(submitted.layout))).toHaveProperty('blocks');
    await expect(page.getByRole('status').filter({hasText:'Unsaved changes'})).toBeVisible();
    await page.screenshot({path:testInfo.outputPath('admin-simple-homepage.png'),fullPage:true});
  });
  test('FAQ add, move and remove preserve edited values and submission order', async ({page}) => {
    await page.goto(`${base}/admin/pages/faq`);
    const list = page.getByRole('region',{name:'FAQ questions'});
    const before = await list.locator('article').count();
    await page.getByRole('button',{name:'+ Add question',exact:true}).click();
    const added = list.locator('article').last();
    await added.getByLabel('Question',{exact:true}).fill('New delivery question');
    await added.getByLabel('Answer',{exact:true}).fill('Your updated delivery answer.');
    await added.getByRole('button',{name:`Move question ${before + 1} up`,exact:true}).click();
    await expect(list.locator('article').nth(before - 1).getByLabel('Question',{exact:true})).toHaveValue('New delivery question');
    await list.locator('article').first().getByRole('button',{name:'Remove question 1',exact:true}).click();
    const submitted = await page.locator('#admin-content form').evaluate(form => Object.fromEntries(new FormData(form as HTMLFormElement)));
    expect(submitted.itemCount).toBe(String(before));
    expect(submitted[`item_${before - 2}_question`]).toBe('New delivery question');
    expect(submitted[`item_${before - 2}_answer`]).toBe('Your updated delivery answer.');
    await expect(page.getByRole('status').filter({hasText:'Unsaved changes'})).toBeVisible();
  });
  test('Page sections can be added and removed without losing unsaved paragraphs', async ({page}) => {
    await page.goto(`${base}/admin/pages/about`);
    const list = page.getByRole('region',{name:'Page sections'});
    await page.getByRole('button',{name:'+ Add section',exact:true}).click();
    const added = list.locator('article').last();
    await added.getByLabel('Section title',{exact:true}).fill('Our promise');
    await added.locator('textarea[name$="_paragraphs"]').fill('First paragraph.\nSecond paragraph.');
    await added.getByRole('button',{name:/Move section .* up/}).click();
    await list.locator('article').first().getByRole('button',{name:'Remove section 1',exact:true}).click();
    const values = await page.locator('#admin-content form').evaluate(form => Array.from(new FormData(form as HTMLFormElement).entries()));
    expect(values).toContainEqual(expect.arrayContaining(['Our promise']));
    expect(values).toContainEqual(expect.arrayContaining(['First paragraph.\nSecond paragraph.']));
  });
  test('Privacy and Terms use the same editable content forms', async ({page}) => {
    for (const key of ['privacy','terms']) {
      await page.goto(`${base}/admin/pages/${key}`);
      await expect(page.locator('input[name="pageKey"]')).toHaveValue(key);
      await page.getByLabel('Page title',{exact:true}).fill(`Updated ${key} page`);
      const submitted = await page.locator('#admin-content form').evaluate(form => Object.fromEntries(new FormData(form as HTMLFormElement)));
      expect(submitted.title).toBe(`Updated ${key} page`);
      expect(Number(submitted.sectionCount)).toBeGreaterThan(0);
      await expect(page.getByRole('button',{name:'Save page',exact:true})).toBeVisible();
      // The next page navigation deliberately discards this disposable edit.
      page.once('dialog', dialog => dialog.accept());
    }
  });
  test('Settings groups preserve header values while editing contact and announcement', async ({page}) => {
    await page.goto(`${base}/admin/store-settings`);
    await expect(page.locator('#website-content')).toHaveAttribute('open','');
    const originalColumns = await page.locator('select[name="desktopColumns"]').inputValue();
    await page.getByLabel('Announcement bar',{exact:true}).fill('A fresh store announcement');
    await page.locator('#website-support > summary').click();
    await page.getByLabel('Support email',{exact:true}).fill('owner@example.com');
    const submitted = await page.locator('#admin-content form').evaluate(form => Object.fromEntries(new FormData(form as HTMLFormElement)));
    expect(submitted.announcement).toBe('A fresh store announcement');
    expect(submitted.supportEmail).toBe('owner@example.com');
    expect(submitted.desktopColumns).toBe(originalColumns);
    await expect(page.locator('#website-content')).not.toHaveAttribute('open','');
    await expect(page.getByRole('button',{name:'Save changes',exact:true})).toBeVisible();
  });
  test('Clear main sections keep security and operational tools accessible under Settings', async ({page}) => {
    await page.goto(`${base}/admin/settings`);
    await expect(page.getByRole('navigation',{name:'Admin navigation'}).getByRole('link')).toHaveCount(19);
    await expect(page.getByRole('navigation',{name:'Admin navigation'}).getByRole('link',{name:'Account security'})).toHaveAttribute('href','/admin/security');
    await expect(page.getByRole('navigation',{name:'Admin navigation'}).getByRole('link',{name:'SEO metadata'})).toHaveAttribute('href','/admin/seo');
    const related = page.getByRole('navigation',{name:'Related store tools'});
    await expect(related.getByRole('link',{name:'Security',exact:true})).toHaveAttribute('href','/admin/security');
    await expect(related.getByRole('link',{name:'History & restore',exact:true})).toBeVisible();
    await expect(related.getByRole('link',{name:'Health & backups',exact:true})).toBeVisible();
  });
  test('Visual layout changes display the unsaved indicator', async ({page}) => {
    await page.goto(`${base}/admin/builder`);
    await page.getByRole('button',{name:/Text & heading/}).click();
    await expect(page.getByRole('status').filter({hasText:'Unsaved changes'})).toBeVisible();
  });
  test('Properties keeps all homepage and navigation controls beside the preview', async ({page},testInfo) => {
    await page.setViewportSize({width:1440,height:960});
    await page.goto(`${base}/admin/preview-properties`);
    const properties=page.getByRole('complementary',{name:'Selected component properties'});
    await expect(page.locator('#admin-content form')).toHaveCount(1);
    await properties.getByRole('button',{name:'All section properties'}).click();
    await expect(properties.getByLabel('Main banner headline',{exact:true})).toBeVisible();
    await properties.getByLabel('Main banner headline',{exact:true}).fill('Puja homepage headline');
    expect(JSON.parse(await page.locator('input[name="coreContent"]').inputValue()).headline).toBe('Puja homepage headline');
    await properties.getByRole('button',{name:'Header, footer & website'}).click();
    await properties.locator('#website-layout > summary').click();
    await properties.getByLabel('Menu item 1 label',{exact:true}).fill('Discover');
    await properties.getByLabel('Menu item 1 destination',{exact:true}).fill('/shop');
    await properties.getByRole('button',{name:'Selected section',exact:true}).click();
    await expect(properties.getByLabel('Main banner headline',{exact:true})).toHaveValue('Puja homepage headline');
    const data=await page.locator('#admin-content form').evaluate(form=>Object.fromEntries(new FormData(form as HTMLFormElement)));
    expect(data.navLabel0).toBe('Discover');expect(data.headline).toBe('Puja homepage headline');expect(data.settingsControls).toBe('1');expect(data.storefrontVersion).toBe('fixture-content-version');
    await expect(properties.locator('a[href="/admin/settings"],a[href="/admin/pages/about"],a[href="/admin/media"],a[href="/admin/merchandising"]')).toHaveCount(0);
    await expect(page.locator('[data-builder-preview-host]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('preview-full-properties-desktop.png'),fullPage:true});
  });
  test('Properties edits complete page content and previews added, reordered sections',async({page})=>{
    await page.goto(`${base}/admin/preview-properties?page=about`);
    const properties=page.getByRole('complementary',{name:'Selected component properties'});
    await properties.getByLabel('Paragraphs (one per line)').first().fill('Owner paragraph one\nOwner paragraph two');
    await properties.getByLabel('Bullets (one per line)').first().fill('Owner bullet');
    const frame=page.frameLocator('iframe[title="Saved about page preview"]');
    await expect(frame.getByText('Owner paragraph two',{exact:true})).toBeVisible();
    await expect(frame.getByText('Owner bullet',{exact:true})).toBeVisible();
    await properties.getByRole('button',{name:'Add section',exact:true}).click();
    const headings=properties.getByRole('textbox',{name:/Section \d+ heading/});
    await headings.last().fill('New owner section');
    await expect(frame.getByRole('heading',{name:'New owner section',exact:true})).toBeVisible();
    const draft=JSON.parse(await page.locator('input[name="pageContent"]').inputValue());
    expect(draft.sections[0].paragraphs).toEqual(['Owner paragraph one','Owner paragraph two']);
    await properties.getByRole('button',{name:'Move section 1 down',exact:true}).click();
    const moved=JSON.parse(await page.locator('input[name="pageContent"]').inputValue());
    expect(moved.sections[1].paragraphs).toEqual(draft.sections[0].paragraphs);
    await frame.locator('header').click();
    await expect(properties.getByRole('button',{name:'Header, footer & website'})).toHaveAttribute('aria-pressed','true');
    await expect(page).toHaveURL(`${base}/admin/preview-properties?page=about`);
  });
  test('Properties manages full FAQ answers and preview without opening another page',async({page})=>{
    await page.goto(`${base}/admin/preview-properties?page=faq`);
    const properties=page.getByRole('complementary',{name:'Selected component properties'});
    await properties.getByLabel('Question',{exact:true}).first().fill('Owner question?');
    await properties.getByLabel('Answer',{exact:true}).first().fill('Owner complete answer.');
    const frame=page.frameLocator('iframe[title="Saved faq page preview"]');
    await expect(frame.getByText('Owner question?',{exact:false})).toBeVisible();
    await frame.locator('details').first().evaluate(element=>(element as HTMLDetailsElement).open=true);
    await expect(frame.getByText('Owner complete answer.',{exact:true})).toBeVisible();
    await properties.getByRole('button',{name:'Add question',exact:true}).click();
    await properties.getByLabel('Question',{exact:true}).last().fill('Added FAQ?');
    await properties.getByLabel('Answer',{exact:true}).last().fill('Added answer.');
    const draft=JSON.parse(await page.locator('input[name="faqContent"]').inputValue());
    expect(draft.items.at(-1)).toEqual({question:'Added FAQ?',answer:'Added answer.'});
    await expect(page).toHaveURL(`${base}/admin/preview-properties?page=faq`);
  });
  test('Campaign placement and image uploads work inside Properties on mobile',async({page},testInfo)=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(`${base}/admin/preview-properties`);
    const properties=page.getByRole('complementary',{name:'Selected component properties'});
    await properties.getByRole('button',{name:'All section properties'}).click();
    await properties.locator('#home-products > summary').click();
    await properties.getByRole('button',{name:'Add homepage placement'}).click();
    await properties.getByLabel('Placement type').last().selectOption('campaign');
    await properties.getByLabel('Campaign reference').last().selectOption('puja');
    await expect(properties.getByRole('status').filter({hasText:'Schedule: live'})).toBeVisible();
    const placements=JSON.parse(await page.locator('input[name="homepageMerchandising"]').inputValue());
    expect(placements.at(-1)).toMatchObject({kind:'campaign',referenceId:'puja',enabled:true});
    await properties.getByText('Upload an image',{exact:true}).click();
    await properties.getByLabel('New website image').setInputFiles({name:'banner.webp',mimeType:'image/webp',buffer:Buffer.from('fixture')});
    await properties.getByRole('button',{name:'Upload image here'}).click();
    await expect(properties.getByRole('status').filter({hasText:'Image uploaded.'})).toBeVisible();
    await expect(properties.locator('select[name="heroImagePath"]')).toHaveValue('media/fixture-upload.webp');
    const frame=page.frameLocator('iframe[title="Real storefront preview at 1280 pixels"]');
    await expect(frame.locator('[data-builder-image]')).toHaveAttribute('src','/api/storefront-media/fixture-upload.webp');
    await expect(page).toHaveURL(`${base}/admin/preview-properties`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('preview-full-properties-mobile.png'),fullPage:true});
  });

  test('Plain owner dashboard shows direct tasks without builder or preview tools',async({page},testInfo)=>{
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`${base}/admin/dashboard`);
      await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
      await expect(page.getByRole('heading',{name:'What would you like to update?'})).toBeVisible();
      await expect(page.locator('.admin-task-card')).toHaveCount(16);
      await expect(page.locator('iframe')).toHaveCount(0);
      await expect(page.locator('a[href*="builder"],a[href*="preview"],a[href*="publishing"]')).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:testInfo.outputPath(`plain-admin-${width}.png`),fullPage:true});
    }
  });
  test('Homepage settings retain editable content and a single direct save without preview',async({page})=>{
    await page.goto(`${base}/admin/website`);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('a[href*="builder"],a[href*="preview"]')).toHaveCount(0);
    await expect(page.locator('#admin-content form')).toHaveCount(1);
    await page.getByLabel('Default background for all hero banners',{exact:true}).fill('#123456');
    await expect(page.locator('input[name="heroBackground"]')).toHaveValue('#123456');
    await page.getByLabel('Main banner background',{exact:true}).fill('#ffffff');
    await expect(page.locator('input[name="mainHeroBackground"]')).toHaveValue('#ffffff');
    await page.getByRole('group',{name:'Main banner background',exact:true}).getByRole('button',{name:'Use default background',exact:true}).click();
    await expect(page.locator('input[name="mainHeroBackground"]')).toHaveValue('');
    await page.getByText('Additional content (0)',{exact:true}).click();
    await page.getByRole('button',{name:'Add extra section'}).click();
    await page.getByLabel('Extra heading',{exact:true}).fill('Our new story');
    await page.getByLabel('Extra text',{exact:true}).fill('Useful information for our customers.');
    const values=await page.locator('#admin-content form').evaluate(form=>Object.fromEntries(new FormData(form as HTMLFormElement)));
    expect(values.homepageEditor).toBe('1');
    expect(JSON.parse(String(values.layout)).blocks[0]).toMatchObject({title:'Our new story',body:'Useful information for our customers.'});
    expect(values.headline).toBeTruthy();
    await page.getByRole('button',{name:'Remove extra section'}).click();
    expect(JSON.parse(await page.locator('input[name="layout"]').inputValue()).blocks).toHaveLength(0);
    await expect(page.getByRole('button',{name:'Save homepage',exact:true})).toBeVisible();
  });

});
