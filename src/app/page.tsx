import { StorefrontMotion, RevealText } from "@/components/storefront-motion";
import "./homepage.css";
import { HeroBannerFrame } from "@/components/hero-banner-frame";
import { HeroProductGallery } from "@/components/hero-product-gallery";
import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import { HomepageLiveDraft } from "@/components/homepage-live-draft";
import type { HomepageBlockId } from "@/lib/homepage-builder";
import Image from "next/image";
import Link from "next/link";
import { HomepagePromoBanners, activeHomepageBanners } from "@/components/homepage-promo-banners";
import { HomepageHeroCarousel } from "@/components/homepage-hero-carousel";
import { HomepageBrandShowcase } from "@/components/homepage-brand-showcase";
import { readBrandImageAssignments } from "@/lib/brand-image-store";
import { VisualBuilderBlock } from "@/components/visual-builder-block";
import { HomepageCategoryShowcase } from "@/components/homepage-category-showcase";
import { HomepageEditorialSections } from "@/components/homepage-editorial-sections";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import { MerchandisingProductGrid } from "@/components/merchandising-product-grid";
import { AnalyticsViewTracker } from "@/components/storefront-analytics-tracker";
import { TrackedLink } from "@/components/tracked-link";
import { mergeLiveCatalog, products as localProducts } from "@/lib/catalog";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  applyMerchandisingRules,
  collectionHref,
  isCampaignActive,
  productsForHomepageSection,
  selectCampaignProducts,
} from "@/lib/merchandising";
import { buildSeoMetadata } from "@/lib/seo-manager";
import {
  applyStorefrontEditorial,
  defaultSeoConfig,
  readStorefrontConfig,
  storefrontMediaUrl,
} from "@/lib/storefront-admin-store";

const routine = [
  {
    step: "01",
    title: "Cleanse",
    copy: "Start with a comfortable cleanse that fits your morning and evening routine.",
    href: "/category/cleansers",
  },
  {
    step: "02",
    title: "Moisturize",
    copy: "Choose the texture that feels right for the day, from light hydration to richer comfort.",
    href: "/category/moisturizers",
  },
  {
    step: "03",
    title: "Protect",
    copy: "Finish the morning with sunscreen and make daily protection part of the routine.",
    href: "/category/sunscreen",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return buildSeoMetadata(config.seo.homepage, {
    title: defaultSeoConfig.homepage.title || "Aloyri — Let Your Skin Glow.",
    description:
      defaultSeoConfig.homepage.description ||
      "Curated skincare for Bangladesh.",
    canonical: "/",
    index: true,
    follow: true,
    ogTitle: defaultSeoConfig.homepage.ogTitle,
    ogDescription: defaultSeoConfig.homepage.ogDescription,
    ogImagePath: defaultSeoConfig.homepage.ogImagePath,
  });
}

export default async function Home({ searchParams }: { searchParams: Promise<{ builderPreview?: string }> }) {
  const { builderPreview } = await searchParams;
  const [config, crm, brandImages] = await Promise.all([
    readStorefrontConfig(),
    fetchCrmCatalog(),
    readBrandImageAssignments(),
  ]);

  const catalogProducts = crm.ok
    ? mergeLiveCatalog(
        applyMerchandisingRules(
          applyStorefrontEditorial(crm.body.products, config),
          config,
        ),
      )
    : localProducts.map((product) => {
        const rule = config.merchandising.productRules[product.id];
        const outOfStockMode =
          rule?.outOfStockMode && rule.outOfStockMode !== "inherit"
            ? rule.outOfStockMode
            : config.merchandising.outOfStockMode;
        return {
          ...product,
          ...(config.products[product.id] || {}),
          merchandisingBadge: rule?.badge,
          merchandisingPriority: rule?.priority || 0,
          merchandisingOutOfStockMode: outOfStockMode,
        };
      });

  const home = config.homepage;
  const heroProduct =
    catalogProducts.find((product) => product.id === home.heroProductId && (product.availableStock ?? 0) > 0) ??
    catalogProducts.find((product) => (product.availableStock ?? 0) > 0) ??
    catalogProducts[0] ??
    localProducts[0];
  const homepageSections = config.merchandising.homepageSections.filter(
    (section) => section.enabled,
  );

  const heroGalleryProducts = home.heroProductIds.flatMap(id => {
    const product = catalogProducts.find(candidate => candidate.id === id && candidate.active !== false);
    return product ? [product] : [];
  });
  const carouselPromos = home.showHero && home.promoPlacement === "before-products"
    ? activeHomepageBanners(home.promoBanners) : [];

  // When no promotional banners are configured, offer evergreen discovery cards
  // rather than inventing prices, discounts, or stock claims.
  const evergreenSlides: ReactNode[] = carouselPromos.length ? [] : [
    { key: "bestsellers", eyebrow: "Explore Aloyri", title: "Meet your next skincare favourite.", copy: "Browse the products our community loves to discover.", label: "Shop bestsellers", href: "/shop?sort=bestseller" },
    { key: "routine", eyebrow: "A little guidance", title: "Your routine, made simpler.", copy: "Find a starting point for everyday skincare.", label: "Find your routine", href: "/routine-finder" },
  ].map((banner, index) => <section key={banner.key} className="store-campaign-intro">
    <HeroBannerFrame background={(index === 0 ? home.bestsellersBackground : home.routineBackground) || home.heroBackground} style={home.heroStyle} alignment={home.heroAlignment} stacked={home.heroLayout === "stacked"} showImageOnMobile={config.presentation.showHeroImageOnMobile}
      copy={<><div className="store-home-overline flex items-center gap-3"><span className="h-px w-8 bg-[#b9725f]/55" />{banner.eyebrow}</div>
        <div className="max-w-2xl py-8 lg:py-10"><h2 className="store-hero-heading display max-w-[13ch] text-[clamp(2.25rem,4.8vw,5rem)] leading-[1.02]">{banner.title}</h2>
          <p className="store-hero-muted mt-7 max-w-xl text-base leading-7 sm:text-lg">{banner.copy}</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href={banner.href} className="store-hero-primary inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5">{banner.label}<ArrowIcon /></Link></div></div></>}
      visual={<ProductMedia product={catalogProducts[index] || heroProduct} sizes="(max-width: 1024px) 90vw, 600px" className="store-hero-product aspect-square max-h-[440px] rounded-[2rem] soft-shadow" />} />
  </section>);


  const blocks: Record<HomepageBlockId, ReactNode> = {
    hero: (
      <>
      {home.showHero && <HomepageHeroCarousel slides={[<section key="intro" className="store-campaign-intro">
        <HeroBannerFrame background={home.mainHeroBackground || home.heroBackground} style={home.heroStyle} alignment={home.heroAlignment} stacked={home.heroLayout === "stacked"} showImageOnMobile={config.presentation.showHeroImageOnMobile}
          copy={<>            <div className="store-home-overline flex items-center gap-3">
              <span className="h-px w-8 bg-[#b9725f]/55" />
              {home.eyebrow}
            </div>

            <div className="max-w-2xl py-8 lg:py-10">
              {home.heroDiscountMode === "label" ? <p className="hero-offer-badge mb-3">5% OFF</p> :
                home.heroDiscountMode === "checkout" && home.heroPromotionCode && heroGalleryProducts.length ?
                <p className="hero-offer-badge mb-3">5% OFF <span>Eligible products at checkout</span></p> : null}
              <h1 className="store-hero-heading display max-w-[13ch] text-[clamp(2.25rem,4.8vw,5rem)] leading-[1.02]">
                {home.headline}
              </h1>
              <p className="store-hero-muted mt-7 max-w-xl text-base leading-7 sm:text-lg">
                {home.intro}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href={home.primaryHref}
                  className="store-hero-primary inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5"
                >
                  {home.primaryLabel} <ArrowIcon />
                </Link>
                <Link
                  href={home.secondaryHref}
                  className="store-hero-secondary rounded-full border px-6 py-3.5 text-sm font-medium transition hover:brightness-95"
                >
                  {home.secondaryLabel}
                </Link>
              </div>
            </div>

</>} visual={<>                {home.heroImagePath ? (
                  <div className="relative aspect-square max-h-[440px] overflow-hidden rounded-[2rem] soft-shadow">
                    <Image src={storefrontMediaUrl(home.heroImagePath)} alt={home.headline || "Aloyri homepage banner"} fill priority sizes="(max-width: 1024px) 90vw, 600px" className="object-cover" />
                  </div>
                ) : heroGalleryProducts.length ? (
                  <HeroProductGallery products={heroGalleryProducts}
                    offer={{ bannerId: "main", mode: home.heroDiscountMode,
                      promotionCode: home.heroPromotionCode, productIds: home.heroProductIds }} />
                ) : (
                <ProductMedia
                  product={heroProduct}
                  priority
                  sizes="(max-width: 1024px) 90vw, 600px"
                  className="store-hero-product aspect-square max-h-[440px] rounded-[2rem] soft-shadow"
                />
                )}
                {!home.heroImagePath && !heroGalleryProducts.length && <div className="store-hero-product-caption absolute -bottom-5 left-5 right-5 rounded-[1.35rem] border border-white/70 bg-white/90 p-5 shadow-xl backdrop-blur-md sm:left-8 sm:right-8">
                  <div className="flex min-w-0 items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/50">
                        Featured skincare
                      </p>
                      <p className="mt-1 text-sm font-semibold">{heroProduct.brand}</p>
                      <p className="mt-0.5 text-sm text-[#321f1c]/65">{heroProduct.name}</p>
                    </div>
                    <TrackedLink
                      href={`/product/${heroProduct.slug}`}
                      analyticsEvent="merchandising_click"
                      analyticsProperties={{
                        productId: heroProduct.id,
                        placementId: "homepage-hero",
                        placementKind: "hero",
                      }}
                      analyticsContext={{
                        placementId: "homepage-hero",
                        placementKind: "hero",
                      }}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#713a35] text-white"
                      aria-label={`View ${heroProduct.name}`}
                    >
                      <ArrowIcon />
                    </TrackedLink>
                  </div>
                </div>}</>} />
      </section>, ...carouselPromos.map((banner, index) => <HomepagePromoBanners key={index} banners={[banner]} compact defaultBackground={home.heroBackground} heroStyle={home.heroStyle} heroAlignment={home.heroAlignment} heroStacked={home.heroLayout === "stacked"} showImageOnMobile={config.presentation.showHeroImageOnMobile} products={catalogProducts} bannerOffset={index} />), ...evergreenSlides]} />}
      </>
    ),
    browse: null,
    categories: (
      <>
      {home.showCategories ? <HomepageCategoryShowcase products={catalogProducts} categories={crm.ok ? crm.body.categories : []} eyebrow={home.categoriesEyebrow} title={home.categoriesTitle} intro={home.categoriesIntro} /> : null}
      </>
    ),
    brands: <HomepageBrandShowcase products={crm.ok ? catalogProducts : []} brands={crm.ok ? crm.body.brands : []} images={brandImages.images} />,
    focus: null,
    routineFinder: (
      <>
      {home.showRoutineFinder ? (
        <section className="shell home-finder-scroll-section pb-10 pt-2 md:pb-14" aria-labelledby="routine-finder-feature">
          <div className="store-discovery-feature home-finder-scroll-layout grid overflow-hidden rounded-[2rem] border lg:grid-cols-[1.1fr_.9fr]">
            <div className="home-finder-scroll-intro p-7 sm:p-10 lg:p-14">
              <p className="store-discovery-muted text-[11px] font-semibold uppercase tracking-[.22em]">A little guidance, a better beginning</p>
              <h2 id="routine-finder-feature" className="store-discovery-title display mt-5 max-w-lg text-4xl leading-tight sm:text-5xl">
                {home.routineFinderHeadline}
              </h2>
              <p className="store-discovery-muted mt-5 max-w-xl text-sm leading-7">
                {home.routineFinderIntro}
              </p>
              <Link href="/routine-finder" className="store-discovery-button mt-8 inline-flex min-h-12 items-center gap-3 rounded-full px-6 py-3 text-sm font-semibold">
                Find your routine <ArrowIcon />
              </Link>
            </div>
            <div className="store-discovery-feature-steps home-finder-scroll-cards grid gap-3 p-5 sm:p-7 lg:p-9">
              {[
                ["01", "Tell us what feels right", "Choose how your skin usually feels."],
                ["02", "Choose your priority", "Hydration, light texture, simplicity or daily SPF."],
                ["03", "Explore the edit", "See relevant products with live availability."],
              ].map(([number, title, description]) => (
                <div key={number} className="store-discovery-step home-finder-scroll-card">
                  <span className="store-discovery-accent display text-2xl">{number}</span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="store-discovery-muted mt-1 text-xs leading-5">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      </>
    ),
    editorialBeforeProducts: (
      <>
      <HomepageEditorialSections sections={home.editorialSections} position="before-products" />
      </>
    ),
    promoBeforeProducts: (
      <>
      {home.promoPlacement === "before-products" && (!home.showHero || home.visualLayout.hiddenCore.includes("hero")) ? <HomepagePromoBanners banners={home.promoBanners} products={catalogProducts} /> : null}
      </>
    ),
    products: (
      <>
      {homepageSections.map((section) => {
        if (section.kind === "campaign") {
          const campaign = config.merchandising.campaigns.find(
            (candidate) =>
              candidate.id === section.referenceId &&
              isCampaignActive(candidate),
          );
          if (!campaign) return null;

          const campaignProducts = campaign.showProducts
            ? selectCampaignProducts(
                campaign,
                catalogProducts,
                config.merchandising,
              ).slice(0, section.maxProducts)
            : [];
          const campaignProductIds = campaignProducts.map(
            (product) => product.id,
          );

          return (
            <section key={section.id} className="shell py-10 md:py-16">
              <AnalyticsViewTracker
                event="campaign_impression"
                properties={{
                  campaignId: campaign.id,
                  placementId: section.id,
                  placementKind: section.kind,
                }}
                context={{ campaignId: campaign.id }}
              />
              <AnalyticsViewTracker
                event="merchandising_impression"
                properties={{
                  placementId: section.id,
                  placementKind: section.kind,
                  campaignId: campaign.id,
                }}
                context={{
                  placementId: section.id,
                  placementKind: section.kind,
                  campaignId: campaign.id,
                }}
              />
              <div className="overflow-hidden rounded-[2rem] border border-[#713a35]/10 bg-[#713a35] text-white">
                <div className="grid lg:grid-cols-[1.08fr_.92fr]">
                  <div className="p-8 sm:p-10 lg:p-14">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                      {campaign.badgeText || section.eyebrow || campaign.eyebrow}
                    </p>
                    <h2 className="display mt-4 max-w-3xl text-5xl leading-[0.94] sm:text-6xl">
                      {section.title || campaign.title}
                    </h2>
                    <p className="mt-6 max-w-2xl text-sm leading-7 text-white/65">
                      {section.copy || campaign.copy}
                    </p>
                    {campaign.ctaLabel ? (
                      <TrackedLink
                        href={campaign.ctaHref || "/shop"}
                        analyticsEvent="campaign_click"
                        analyticsProperties={{
                          campaignId: campaign.id,
                          placementId: section.id,
                          placementKind: section.kind,
                        }}
                        analyticsContext={{
                          campaignId: campaign.id,
                          placementId: section.id,
                          placementKind: section.kind,
                        }}
                        className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#713a35]"
                      >
                        {campaign.ctaLabel} <ArrowIcon />
                      </TrackedLink>
                    ) : null}
                    {campaign.promotionOnly ? (
                      <p className="mt-4 text-[11px] leading-5 text-white/50">
                        Current offers are shown on eligible products.
                      </p>
                    ) : null}
                  </div>
                  <div className="relative min-h-[300px] bg-[#9c5d50]">
                    {campaign.imagePath ? (
                      <Image
                        src={storefrontMediaUrl(campaign.imagePath)}
                        alt={campaign.title}
                        fill
                        sizes="(min-width: 1024px) 42vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(255,255,255,.24),transparent_40%)]" />
                    )}
                  </div>
                </div>
              </div>

              {campaign.showProducts && campaignProductIds.length ? (
                <div className="mt-10">
                  <MerchandisingProductGrid
                    productIds={campaignProductIds}
                    fallbackProducts={campaignProducts}
                    outOfStockMode={
                      campaign.outOfStockMode &&
                      campaign.outOfStockMode !== "inherit"
                        ? campaign.outOfStockMode
                        : config.merchandising.outOfStockMode
                    }
                    maxProducts={section.maxProducts}
                    promotionOnly={campaign.promotionOnly}
                    overrideProductRules={
                      Boolean(
                        campaign.outOfStockMode &&
                          campaign.outOfStockMode !== "inherit",
                      )
                    }
                    campaignId={campaign.id}
                    placementId={section.id}
                    placementKind={section.kind}
                  />
                </div>
              ) : null}
            </section>
          );
        }

        const selected = productsForHomepageSection(
          section,
          config.merchandising,
          catalogProducts,
        );
        if (!selected.length) return null;

        const productIds = selected.map((product) => product.id);
        const collection =
          section.kind === "collection"
            ? config.merchandising.collections.find(
                (candidate) => candidate.id === section.referenceId,
              )
            : undefined;
        const sectionHref = collection ? collectionHref(collection) : "/shop";
        const displayEyebrow =
          section.eyebrow ||
          collection?.eyebrow ||
          (section.kind === "new-arrivals"
            ? "New arrivals"
            : section.kind === "bestsellers"
              ? "Bestsellers"
              : "Aloyri selection");
        const displayTitle =
          section.title ||
          collection?.title ||
          (section.kind === "new-arrivals"
            ? "New to the Aloyri edit."
            : section.kind === "bestsellers"
              ? "The products people start with."
              : "Everyday skincare, clearly presented.");
        const displayCopy =
          section.copy || collection?.description || "";
        const mode = collection
          ? collection.outOfStockMode === "inherit"
            ? config.merchandising.outOfStockMode
            : collection.outOfStockMode
          : config.merchandising.outOfStockMode;

        return (
          <section key={section.id} className="shell home-product-section py-10 md:py-14">
            <AnalyticsViewTracker
              event="merchandising_impression"
              properties={{
                placementId: section.id,
                placementKind: section.kind,
                ...(collection ? { collectionId: collection.id } : {}),
              }}
              context={{
                placementId: section.id,
                placementKind: section.kind,
                ...(collection ? { collectionId: collection.id } : {}),
              }}
            />
            <div className="mb-7 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
                  {displayEyebrow}
                </p>
                <h2 className="display mt-3 text-4xl text-[#321f1c] sm:text-5xl">
                  {displayTitle}
                </h2>
                {displayCopy ? (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#321f1c]/52">
                    {displayCopy}
                  </p>
                ) : null}
              </div>
              <TrackedLink
                href={sectionHref}
                analyticsEvent="merchandising_click"
                analyticsProperties={{
                  placementId: section.id,
                  placementKind: section.kind,
                  ...(collection ? { collectionId: collection.id } : {}),
                }}
                analyticsContext={{
                  placementId: section.id,
                  placementKind: section.kind,
                  ...(collection ? { collectionId: collection.id } : {}),
                }}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#713a35]"
              >
                {collection ? "View collection" : "Shop all"} <ArrowIcon />
              </TrackedLink>
            </div>

            <MerchandisingProductGrid
              productIds={productIds}
              fallbackProducts={selected}
              outOfStockMode={mode}
              maxProducts={section.maxProducts}
              overrideProductRules={
                Boolean(
                  collection && collection.outOfStockMode !== "inherit",
                )
              }
              collectionId={collection?.id}
              placementId={section.id}
              placementKind={section.kind}
            />
          </section>
        );
      })}
      </>
    ),
    editorialAfterProducts: (
      <>
      <HomepageEditorialSections sections={home.editorialSections} position="after-products" />
      </>
    ),
    promoAfterProducts: (
      <>
      {home.promoPlacement === "after-products" ? <HomepagePromoBanners banners={home.promoBanners} products={catalogProducts} /> : null}
      </>
    ),
    routineSteps: (
      <>
      {home.showRoutineSteps && config.presentation.showRoutine && <section className="home-routine-section">
        <div className="shell py-16 md:py-20">
          <div className="home-routine-layout home-routine-stack-layout">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/50">
                Build a simple routine
              </p>
              <h2 className="display mt-4 max-w-md text-5xl leading-[0.94] sm:text-6xl">
                <RevealText>Three steps. Less guesswork.</RevealText>
              </h2>
            </div>

            <div className="home-routine-cards home-routine-stack">
              {routine.map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  className="home-routine-card home-routine-stack-card group"
                >
                  <span className="rose-text text-sm font-semibold">{item.step}</span>
                  <div>
                    <p className="text-base font-semibold">{item.title}</p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#321f1c]/52">
                      {item.copy}
                    </p>
                  </div>
                  <ArrowIcon className="hidden h-4 w-4 text-[#713a35] transition group-hover:translate-x-1 sm:block" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>}
      </>
    ),
    editorialBeforeStory: (
      <>
      <HomepageEditorialSections sections={home.editorialSections} position="before-story" />
      </>
    ),
    brandStory: (
      <>
      {home.showBrandStory && <section className="shell home-story-section py-12 md:py-16">
        <div className="store-brand-panel overflow-hidden rounded-[2rem]">
          <div className="grid lg:grid-cols-[1.18fr_.82fr]">
            <div className="p-8 sm:p-10 lg:p-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                {home.ideaEyebrow}
              </p>
              <h2 className="display mt-4 max-w-3xl text-5xl leading-[0.94] sm:text-6xl lg:text-7xl">
                {home.ideaHeadline}
              </h2>
              <p className="mt-7 max-w-xl text-sm leading-7 text-white/62">
                {home.ideaCopy}
              </p>
              <Link
                href="/shop"
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#fff8f5] px-6 py-3.5 text-sm font-semibold text-[#713a35]"
              >
                Browse skincare <ArrowIcon />
              </Link>
            </div>

            <div className="home-story-products" aria-label="Discover the Aloyri skincare collection">
              {catalogProducts.filter(product => product.active !== false && (product.availableStock ?? 0) > 0).slice(0, 2).map((product, index) => (
                <Link key={product.id} href={`/product/${product.slug}`} className={`home-story-product home-story-product-${index}`}>
                  <ProductMedia product={product} sizes="(max-width: 640px) 42vw, 230px" className="aspect-[4/5] rounded-2xl" />
                  <span className="mt-3 block text-xs font-medium">{product.brand}<span className="sr-only"> — {product.name}</span><span aria-hidden="true" className="ml-2">↗</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>}
      </>
    ),
  };

  return (
    <StorefrontMotion><main className="skincare-home">
      <AnalyticsViewTracker
        event="merchandising_impression"
        properties={{ placementId: "homepage-hero", placementKind: "hero" }}
        context={{ placementId: "homepage-hero", placementKind: "hero" }}
      />
      {builderPreview === "1" ? <HomepageLiveDraft initialLayout={home.visualLayout} sections={Object.entries(blocks).map(([id, content]) => ({ id, content }))} /> : home.visualLayout.order.map((entry) => {
        if (entry.startsWith("core:")) {
          const id = entry.slice(5) as HomepageBlockId;
          if (home.visualLayout.hiddenCore.includes(id)) return null;
          return <Fragment key={entry}>{blocks[id]}</Fragment>;
        }
        const block = home.visualLayout.blocks.find(item => entry === `custom:${item.id}`);
        return block ? <VisualBuilderBlock key={entry} block={block} /> : null;
      })}
    </main></StorefrontMotion>
  );
}
