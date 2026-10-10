/** Checkout discounts are calculated by CRM, never by banner display text. */
export type HeroBannerDiscountMode = "none" | "label" | "checkout";
export const HERO_BANNER_DISCOUNT_PERCENT = 5;
export const MAX_HERO_PRODUCTS = 6;
export const HERO_BANNER_CLAIM_KEY = "aloyri_hero_promotion_claim";
export type HeroBannerOffer = { bannerId: string; mode: HeroBannerDiscountMode; promotionCode: string; productIds: string[] };
export type HeroBannerClaim = { bannerId: string; code: string; productIds: string[]; percent: 5; claimedAt: number };

export function normalizeHeroDiscountMode(value: unknown): HeroBannerDiscountMode {
  return value === "label" || value === "checkout" ? value : "none";
}
export function normalizeHeroProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(id)))].slice(0, MAX_HERO_PRODUCTS);
}
export function normalizeHeroPromotionCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9_-]{1,40}$/.test(code) ? code : "";
}
export function readHeroBannerClaim(value: unknown, now = Date.now()): HeroBannerClaim | null {
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const claim = parsed as Partial<HeroBannerClaim>;
    const code = normalizeHeroPromotionCode(claim.code);
    const productIds = normalizeHeroProductIds(claim.productIds);
    if (!code || !productIds.length || claim.percent !== 5 ||
      typeof claim.bannerId !== "string" || !/^(main|promo-[0-3])$/.test(claim.bannerId) ||
      typeof claim.claimedAt !== "number" || !Number.isFinite(claim.claimedAt) ||
      claim.claimedAt > now + 60_000 || now - claim.claimedAt > 2 * 60 * 60_000) return null;
    return { bannerId: claim.bannerId, code, productIds, percent: 5, claimedAt: claim.claimedAt };
  } catch { return null; }
}
export function bannerOfferIsRedeemable(offer: HeroBannerOffer): boolean {
  return offer.mode === "checkout" && Boolean(normalizeHeroPromotionCode(offer.promotionCode)) && normalizeHeroProductIds(offer.productIds).length > 0;
}
export function claimOffer(offer: HeroBannerOffer, now = Date.now()): HeroBannerClaim | null {
  if (!bannerOfferIsRedeemable(offer)) return null;
  return { bannerId: offer.bannerId, code: normalizeHeroPromotionCode(offer.promotionCode), productIds: normalizeHeroProductIds(offer.productIds), percent: 5, claimedAt: now };
}
