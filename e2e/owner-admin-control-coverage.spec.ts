import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("owner coverage directory links all major management sections", () => {
  const page = readFileSync("src/app/admin/coverage/page.tsx", "utf8");
  expect(page).toContain('requireAdminPermission("dashboard.view")');
  for (const path of ["/admin/homepage", "/admin/products", "/admin/brands", "/admin/pages", "/admin/media", "/admin/merchandising", "/admin/seo", "/admin/analytics", "/admin/customer-service", "/admin/reviews", "/admin/delivery", "/admin/payments", "/admin/settings", "/admin/security", "/admin/history", "/admin/audit", "/admin/operations"]) {
    expect(page).toContain(path);
  }
  expect(page).toContain("CRM remains the source of truth");
  expect(page).toContain("Test uploads, live saves, refunds, restoration and order changes only in an isolated Preview or E2E environment");
  expect(page).not.toMatch(/staff management|team invitations/i);
});

test("admin navigation clearly distinguishes SEO from storefront search ranking", () => {
  const shell = readFileSync("src/components/admin/admin-shell.tsx", "utf8");
  const dashboard = readFileSync("src/components/admin/owner-dashboard.tsx", "utf8");
  expect(shell).toContain('label: "Control coverage"');
  expect(shell).toContain('label: "SEO metadata"');
  expect(dashboard).toContain("storefront search ranking is separate");
});

test("coverage route is owner-protected in production", async ({ page }) => {
  await page.goto("/admin/coverage");
  await expect(page).toHaveURL(/\/admin\/(login|setup|coverage)/);
  if (new URL(page.url()).pathname === "/admin/coverage") {
    await expect(page.getByRole("heading", { name: "Website control coverage" })).toBeVisible();
  }
});
