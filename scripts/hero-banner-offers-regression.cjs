/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const {
  normalizeHeroDiscountMode, normalizeHeroProductIds,
  normalizeHeroPromotionCode, claimOffer, readHeroBannerClaim,
} = require("../src/lib/hero-banner-offers.ts");

const ids = ["p1", "p2", "p1", "../invalid", "p3", "p4", "p5", "p6", "p7"];
assert.deepEqual(normalizeHeroProductIds(ids), ["p1", "p2", "p3", "p4", "p5", "p6"]);
assert.deepEqual(normalizeHeroProductIds("p1"), []);
assert.equal(normalizeHeroDiscountMode("checkout"), "checkout");
assert.equal(normalizeHeroDiscountMode("label"), "label");
assert.equal(normalizeHeroDiscountMode("anything"), "none");
assert.equal(normalizeHeroPromotionCode("  five5_off "), "FIVE5_OFF");
assert.equal(normalizeHeroPromotionCode("NOT SAFE!"), "");

const offer = { bannerId: "promo-1", mode: "checkout", promotionCode: "  five5_off ", productIds: ["p1", "p2"] };
assert.equal(claimOffer({ ...offer, mode: "label" }), null, "label only must not create checkout claim");
assert.equal(claimOffer({ ...offer, promotionCode: "" }), null, "missing CRM coupon must not claim discount");
assert.equal(claimOffer({ ...offer, productIds: [] }), null, "no selected products must not claim discount");
const timestamp = 1791640000000;
const claim = claimOffer(offer, timestamp);
assert.ok(claim);
assert.equal(claim.percent, 5);
assert.equal(claim.code, "FIVE5_OFF");
assert.deepEqual(claim.productIds, ["p1", "p2"]);
assert.deepEqual(readHeroBannerClaim(JSON.stringify(claim), timestamp + 1000), claim);
assert.equal(readHeroBannerClaim(JSON.stringify({ ...claim, percent: 50 }), timestamp), null);
assert.equal(readHeroBannerClaim(JSON.stringify({ ...claim, code: "BAD CODE!" }), timestamp), null);
assert.equal(readHeroBannerClaim(JSON.stringify({ ...claim, bannerId: "promo-999" }), timestamp), null);
assert.equal(readHeroBannerClaim(JSON.stringify(claim), timestamp + 3 * 3600 * 1000), null);
assert.equal(readHeroBannerClaim("malformed json"), null);
console.log("Hero banner discount safety regressions passed.");
