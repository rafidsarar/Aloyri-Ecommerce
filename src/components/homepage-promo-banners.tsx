import { HeroProductGallery } from "@/components/hero-product-gallery";
import type { Product } from "@/lib/catalog";
import Image from "next/image";
import Link from "next/link";
import { storefrontMediaUrl, type StorefrontConfig } from "@/lib/storefront-admin-store";

function inSchedule(startAt: string, endAt: string, now: number) {
  const parse = (value: string) => value ? Date.parse(value + ":00+06:00") : null;
  const start = parse(startAt);
  const end = parse(endAt);
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return false;
  if (start !== null && end !== null && start >= end) return false;
  return (start === null || now >= start) && (end === null || now < end);
}

function serverTimestamp() { return Date.now(); }

export function activeHomepageBanners(banners: StorefrontConfig["homepage"]["promoBanners"]) {
  const now = serverTimestamp();
  return banners.filter(banner => banner.enabled && banner.title.trim() && inSchedule(banner.startAt, banner.endAt, now));
}

export function HomepagePromoBanners({ banners, compact = false, products = [], bannerOffset = 0 }: {
  banners: StorefrontConfig["homepage"]["promoBanners"];
  compact?: boolean;
  products?: Product[];
  bannerOffset?: number;
}) {
  const visible = activeHomepageBanners(banners);
  if (!visible.length) return null;

  return (
    <div className={compact ? "store-campaign-promo" : "shell grid gap-5 py-8 md:py-12"} aria-label="Storefront promotions">
      {visible.map((banner, index) => (
        <section key={index} className={"store-promo relative grid min-w-0 overflow-hidden rounded-[1.85rem] border " + (banner.layout === "centered" ? "store-promo-centered" : "store-promo-split")}>
          <div className="store-promo-copy relative z-10 flex min-w-0 flex-col items-start justify-center p-7 sm:p-10 lg:p-14">
            {banner.eyebrow ? <p className="store-home-overline">{banner.eyebrow}</p> : null}
            {banner.discountMode === "label" ? <p className="hero-offer-badge mt-3">5% OFF <span>Banner label only</span></p> :
              banner.discountMode === "checkout" && banner.promotionCode && banner.productIds.length ?
                <p className="hero-offer-badge mt-3">5% OFF <span>Eligible products at checkout</span></p> : null}
            <h2 className="display mt-3 max-w-2xl text-[clamp(2rem,4vw,3.7rem)] leading-[1.06]">{banner.title}</h2>
            {banner.copy ? <p className="store-home-muted mt-5 max-w-xl text-sm leading-7 sm:text-base">{banner.copy}</p> : null}
            {banner.ctaHref && banner.ctaLabel ? (
              <Link href={banner.ctaHref} className="store-home-primary mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-7 py-3 text-sm font-semibold">
                {banner.ctaLabel} <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
          <div className={"store-promo-visual relative min-h-[220px] overflow-hidden sm:min-h-[280px] " + (banner.mobileLayout === "compact" && !banner.productIds.length ? "hidden sm:block" : "")}>
            {banner.productIds.length && products.some(product => banner.productIds.includes(product.id) && product.active !== false) ? (
              <HeroProductGallery
                products={banner.productIds.flatMap(id => {
                  const product = products.find(value => value.id === id && value.active !== false);
                  return product ? [product] : [];
                })}
                offer={{ bannerId: `promo-${bannerOffset + index}`, mode: banner.discountMode,
                  promotionCode: banner.promotionCode, productIds: banner.productIds }}
              />
            ) : banner.imagePath ? (
              <Image
                src={storefrontMediaUrl(banner.imagePath)}
                alt={banner.title}
                fill
                sizes="(max-width: 640px) 100vw, (min-width: 1024px) 45vw, 80vw"
                className="object-cover"
              />
            ) : (
              <div className="store-promo-placeholder absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <div className="store-promo-orbit relative grid aspect-square w-[min(64%,260px)] place-items-center rounded-full">
                  <span className="display text-4xl tracking-[-.06em] sm:text-5xl">Aloyri</span>
                  <span className="absolute bottom-[23%] text-[9px] font-semibold uppercase tracking-[.2em]">Everyday skincare</span>
                </div>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
