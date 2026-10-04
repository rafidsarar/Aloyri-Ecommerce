export const siteConfig = {
  name: "Aloyri",
  tagline: "Let Your Skin Glow.",
  description:
    "Aloyri is a curated skincare storefront for Bangladesh with live product availability, BDT pricing, secure checkout and order tracking.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://aloyri-ecommerce.vercel.app",
  locale: "en_BD",
  currency: "BDT",
};

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return siteConfig.url + (path.startsWith("/") ? path : "/" + path);
}
