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
    await expect(nav.getByRole("link", { name: "Homepage", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("searchbox", { name: "Find an admin section" }).fill("payments");
    await expect(nav.getByRole("link", { name: "Payments", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Homepage", exact: true })).toHaveCount(0);
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
});
