import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolveAllProductsCarouselCopy } from "../src/lib/homepage-carousel-copy";

test("all-products carousel preserves the new headings for existing bestseller defaults", () => {
  expect(resolveAllProductsCarouselCopy({
    eyebrow: "Bestsellers",
    title: "The products people start with.",
  })).toEqual({
    eyebrow: "Shop all products",
    title: "Discover all our skincare.",
  });
});

test("Owner edits to all-products heading and eyebrow appear on the storefront", () => {
  expect(resolveAllProductsCarouselCopy({
    eyebrow: "  Pick your essentials ",
    title: "  Explore every routine ",
  })).toEqual({
    eyebrow: "Pick your essentials",
    title: "Explore every routine",
  });
});

test("Admin explains the all-products placement is not capped by Maximum products", () => {
  const editor = readFileSync("src/components/admin/homepage-product-properties.tsx", "utf8");
  const homepage = readFileSync("src/app/page.tsx", "utf8");
  expect(editor).toContain("All-products carousel: every active CRM product is included.");
  expect(editor).toContain('row.kind==="bestsellers" ?');
  expect(homepage).toContain("resolveAllProductsCarouselCopy(section)");
  expect(homepage).toContain("catalogProducts.filter((product) => product.active !== false)");
});
