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

  test("failed account address save keeps the customer's entered form values", async ({ page }) => {
    const account = {
      email: "customer@example.test", displayName: "Preview customer",
      savedAddresses: [], savedProductIds: [],
      emailPreferences: { postDelivery: false, reviewRequest: false, reorderReminder: false },
    };
    await page.route("**/api/customer/post-purchase*", route => route.fulfill({
      json: { account, orders: [], pagination: { page: 1, pages: 1, total: 0 },
        supportCases: [], productAlerts: [] },
    }));
    await page.route("**/api/customer/security", route => route.fulfill({
      json: { activeSessions: 1, currentSessionCreatedAt: "2026-10-08",
        currentSessionExpiresAt: "2026-10-09" },
    }));
    await page.route("**/api/customer/account", route => route.fulfill({
      status: 503,
      json: { error: "Account storage temporarily unavailable." },
    }));
    await page.goto(`${base}/account`);
    await page.getByRole("button", { name: "Addresses", exact: true }).click();
    await page.getByLabel("Recipient name").fill("Preview Customer");
    await page.getByLabel("Mobile number").fill("01712345678");
    await page.getByLabel("District", { exact: true }).fill("Dhaka");
    await page.getByLabel("Area / Thana / Upazila").fill("Dhanmondi");
    await page.getByLabel("Full delivery address").fill("House 12, Road 3, Dhanmondi");
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page.getByRole("alert")).toContainText("storage temporarily unavailable");
    await expect(page.getByLabel("Recipient name")).toHaveValue("Preview Customer");
    await expect(page.getByLabel("Full delivery address")).toHaveValue("House 12, Road 3, Dhanmondi");
  });

});
