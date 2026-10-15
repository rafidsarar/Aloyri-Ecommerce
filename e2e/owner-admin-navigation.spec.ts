import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("owner navigation exposes six clear groups without staff controls", () => {
  const shell = readFileSync("src/components/admin/admin-shell.tsx", "utf8");
  for (const group of ["Dashboard", "Storefront", "Marketing", "Customer operations", "Website settings", "Administration"]) {
    expect(shell).toContain(`group: "${group}"`);
  }
  for (const path of ["/admin/brands", "/admin/seo", "/admin/reviews", "/admin/delivery", "/admin/payments", "/admin/security", "/admin/history", "/admin/audit", "/admin/operations"]) {
    expect(shell).toContain(`href: "${path}"`);
  }
  expect(shell).not.toMatch(/staff\.view|staff\.manage|\/admin\/staff|Team management|Staff management/);
});

test("only the owner can access ecommerce administration", () => {
  const auth = readFileSync("src/lib/admin-auth.ts", "utf8");
  expect(auth).toContain('admin.role === "owner" && ALL_PERMISSIONS.includes(permission)');
  expect(auth).toContain('account.role !== "owner"');
});

test("CRM remains authoritative for product and brand identity", () => {
  const dashboard = readFileSync("src/components/admin/owner-dashboard.tsx", "utf8");
  expect(dashboard).toContain("Product names, brands, prices, stock and order operations are managed in CRM");
  expect(dashboard).toContain("/admin/brands");
  const brands = readFileSync("src/app/admin/brands/actions.ts", "utf8");
  expect(brands).toContain("Ecommerce may edit brand pictures, never brand names or directory membership");
});

test("every main Owner Admin navigation section exists and enforces its required permission", () => {
  const shell = readFileSync("src/components/admin/admin-shell.tsx", "utf8");
  const routes = [...shell.matchAll(/\{ group: "[^"]+", label: "[^"]+", href: "(\/admin[^"]*)", permission: "([^"]+)" \}/g)];
  expect(routes).toHaveLength(18);
  for (const [, href, permission] of routes) {
    const route = href === "/admin" ? "/admin/page.tsx" : href + "/page.tsx";
    const source = readFileSync("src/app" + route, "utf8");
    expect(source, `Unprotected or missing Owner page: ${href}`).toContain(
      `requireAdminPermission("${permission}")`,
    );
  }
});
