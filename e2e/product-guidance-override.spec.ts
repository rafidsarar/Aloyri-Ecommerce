import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolveProductGuidance } from "../src/lib/product-guidance-display";

test("saved Owner product directions and care notes take precedence over manufacturer copy", () => {
  const selected = resolveProductGuidance({
    ownerDirections: ["  Owner: apply a thin layer  ", "", "  Owner: avoid the eyes"],
    ownerCareNotes: ["Owner care instructions"],
    verifiedDirections: ["Manufacturer default directions"],
    verifiedWarnings: ["Manufacturer default warnings"],
    productDirections: ["CRM fallback direction"],
    productCareNotes: ["CRM fallback warning"],
  });
  expect(selected.directions).toEqual(["Owner: apply a thin layer", "Owner: avoid the eyes"]);
  expect(selected.careNotes).toEqual(["Owner care instructions"]);
});

test("manufacturer guidance remains default when the Owner has not customized the product", () => {
  const selected = resolveProductGuidance({
    ownerDirections: [],
    ownerCareNotes: undefined,
    verifiedDirections: ["Verified directions"],
    verifiedWarnings: ["Verified warnings"],
    productDirections: ["Catalog directions"],
    productCareNotes: ["Catalog warnings"],
  });
  expect(selected.directions).toEqual(["Verified directions"]);
  expect(selected.careNotes).toEqual(["Verified warnings"]);
});

test("catalog copy remains the last fallback", () => {
  const selected = resolveProductGuidance({
    ownerDirections: null,
    ownerCareNotes: [],
    verifiedDirections: null,
    verifiedWarnings: [],
    productDirections: ["Catalog step"],
    productCareNotes: ["Catalog care note"],
  });
  expect(selected.directions).toEqual(["Catalog step"]);
  expect(selected.careNotes).toEqual(["Catalog care note"]);
});

test("product pages consume saved Owner guidance without hardcoded courier charges", () => {
  const productPage = readFileSync("src/app/product/[slug]/page.tsx", "utf8");
  const rendering = readFileSync("src/components/live-product-page.tsx", "utf8");
  expect(productPage).toContain("editorialGuidance={config.products[schemaProduct.id]}");
  expect(rendering).toContain("resolveProductGuidance({");
  expect(rendering).not.toContain("Inside Dhaka ৳80 · Outside Dhaka ৳150");
  expect(rendering).not.toContain("৳80 inside Dhaka · ৳150 outside Dhaka");
  expect(rendering).toContain("The current charge is confirmed at checkout.");
});
