import { HeroBannerFrame } from "@/components/hero-banner-frame";
import { ProductMedia } from "@/components/product-media";
import { ArrowIcon } from "@/components/icons";
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
  return banners.filter(banner => banner.enabled && (banner.title.trim() || banner.copy.trim() || banner.imagePath || banner.productIds.length > 0) && inSchedule(banner.startAt, banner.endAt, now));
}

export function HomepagePromoBanners({ banners, compact = false, products = [], bannerOffset = 0, heroStyle = "soft", heroAlignment = "left", heroStacked = false, showImageOnMobile = true }: {
  banners: StorefrontConfig["homepage"]["promoBanners"];
  compact?: boolean;
  products?: Product[];
  bannerOffset?: number;
  heroStyle?: "soft" | "minimal" | "contrast";
  heroAlignment?: "left" | "center";
  heroStacked?: boolean;
  showImageOnMobile?: boolean;
}) {
  const visible = activeHomepageBanners(banners);
  if (!visible.length) return null;

  if (compact) return <div className="store-campaign-promo" aria-label="Storefront promotions">
    {visible.map((banner, index) => {
      const selected = banner.productIds.flatMap(id => {
        const product = products.find(item => item.id === id && item.active !== false);
        return product ? [product] : [];
      });
      const fallback = products.find(item => item.active !== false);
      return <HeroBannerFrame key={index} style={heroStyle} alignment={heroAlignment} stacked={heroStacked} showImageOnMobile={showImageOnMobile}
        copy={<>
          {banner.eyebrow ? <div className="store-home-overline flex items-center gap-3"><span className="h-px w-8 bg-[#b9725f]/55" />{banner.eyebrow}</div> : null}
          <div className="max-w-2xl py-8 lg:py-10">
            {banner.discountMode === "label" ? <p className="hero-offer-badge mb-3">5% OFF <span>Banner label only</span></p> : banner.discountMode === "checkout" && banner.promotionCode && selected.length ? <p className="hero-offer-badge mb-3">5% OFF <span>Eligible products at checkout</span></p> : null}
            {banner.title ? <h2 className="store-hero-heading display max-w-[13ch] text-[clamp(2.25rem,4.8vw,5rem)] leading-[1.02]">{banner.title}</h2> : null}
            {banner.copy ? <p className="store-hero-muted mt-7 max-w-xl text-base leading-7 sm:text-lg">{banner.copy}</p> : null}
            {banner.ctaHref && banner.ctaLabel ? <div className="mt-9 flex flex-wrap gap-3"><Link href={banner.ctaHref} className="store-hero-primary inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5">{banner.ctaLabel}<ArrowIcon /></Link></div> : null}
          </div>
        </>}
        visual={banner.imagePath ? <div className="relative aspect-square max-h-[440px] overflow-hidden rounded-[2rem] soft-shadow"><Image src={storefrontMediaUrl(banner.imagePath)} alt={banner.title || "Aloyri promotional banner"} fill sizes="(max-width: 1024px) 90vw, 600px" className="object-cover" /></div>
          : selected.length ? <HeroProductGallery products={selected} offer={{bannerId:`promo-${bannerOffset+index}`,mode:banner.discountMode,promotionCode:banner.promotionCode,productIds:banner.productIds}} />
          : fallback ? <ProductMedia product={fallback} sizes="(max-width: 1024px) 90vw, 600px" className="store-hero-product aspect-square max-h-[440px] rounded-[2rem] soft-shadow" />
          : <div className="grid aspect-square place-items-center rounded-[2rem] bg-white/50"><span className="display text-4xl">Aloyri</span></div>} />;
    })}
  </div>;

  return (
    <div className={compact ? "store-campaign-promo" : "shell grid gap-5 py-8 md:py-12"} aria-label="Storefront promotions">
      {visible.map((banner, index) => (
        <section key={index} className={"store-promo relative grid min-w-0 overflow-hidden rounded-[1.85rem] border " + (banner.layout === "centered" ? "store-promo-centered" : "store-promo-split")}>
          <div className="store-promo-copy relative z-10 flex min-w-0 flex-col items-start justify-center p-7 sm:p-10 lg:p-14">
            {banner.eyebrow ? <p className="store-home-overline">{banner.eyebrow}</p> : null}
            {banner.discountMode === "label" ? <p className="hero-offer-badge mt-3">5% OFF <span>Banner label only</span></p> :
              banner.discountMode === "checkout" && banner.promotionCode && banner.productIds.length ?
                <p className="hero-offer-badge mt-3">5% OFF <span>Eligible products at checkout</span></p> : null}
            {banner.title ? <h2 className="display mt-3 max-w-2xl text-[clamp(2rem,4vw,3.7rem)] leading-[1.06]">{banner.title}</h2> : null}
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
                alt={banner.title || "Aloyri promotional banner"}
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
