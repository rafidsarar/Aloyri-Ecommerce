import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ownerSaveConflictDestination } from "../src/lib/admin-save-destination";

test("stale Owner saves return to the correct editor instead of the removed builder", () => {
  const cases = [
    [{ scope: "homepage" }, "/admin/homepage"],
    [{ scope: "settings" }, "/admin/settings"],
    [{ scope: "products", target: "crm-product-123" }, "/admin/products/crm-product-123"],
    [{ scope: "pages", target: "faq" }, "/admin/pages/faq"],
    [{ scope: "merchandising", action: "merchandising.discovery_updated" }, "/admin/merchandising/discovery"],
    [{ scope: "merchandising", action: "merchandising.recommendations_updated" }, "/admin/merchandising/recommendations"],
    [{ scope: "merchandising", action: "merchandising.product_rules_updated" }, "/admin/merchandising/products"],
    [{ scope: "seo" }, "/admin/seo"],
  ] as const;
  for (const [params, expected] of cases) {
    expect(ownerSaveConflictDestination(params)).toBe(expected);
  }
});

test("stale Owner save destinations reject unsafe route parameters", () => {
  expect(ownerSaveConflictDestination({ scope: "products", target: "../../settings" })).toBe("/admin/products");
  expect(ownerSaveConflictDestination({ scope: "pages", target: "../../homepage" })).toBe("/admin/pages");
  expect(ownerSaveConflictDestination({ scope: "unknown" })).toBe("/admin");
});

test("save action preserves atomic stale-version protection", () => {
  const source = readFileSync("src/lib/admin-save.ts", "utf8");
  const storage = readFileSync("src/lib/storefront-admin-store.ts", "utf8");
  expect(source).toContain("ownerSaveConflictDestination({");
  expect(source).not.toContain('redirect("/admin/builder?workspace="');
  expect(storage).toContain("if (audit?.expectedUpdatedAt && audit.expectedUpdatedAt !== current.updatedAt)");
  expect(storage).toContain("withAtomicRecordMutation(async () => {");
});
