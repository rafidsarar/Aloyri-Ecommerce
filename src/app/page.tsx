import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
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

export default async function Home() {
  const [config, crm] = await Promise.all([
    readStorefrontConfig(),
    fetchCrmCatalog(),
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
    catalogProducts.find((product) => product.id === home.heroProductId) ??
    catalogProducts.find((product) => (product.availableStock ?? 0) > 0) ??
    catalogProducts[0] ??
    localProducts[0];
  const homepageSections = config.merchandising.homepageSections.filter(
    (section) => section.enabled,
  );

  return (
    <main>
      <AnalyticsViewTracker
        event="merchandising_impression"
        properties={{ placementId: "homepage-hero", placementKind: "hero" }}
        context={{ placementId: "homepage-hero", placementKind: "hero" }}
      />
      <section className="shell pt-5 md:pt-8">
        <div className="grid min-h-[72vh] overflow-hidden rounded-[2rem] border border-[#713a35]/10 bg-[#f5e8e2] lg:grid-cols-[1.03fr_.97fr]">
          <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/55">
              <span className="h-px w-8 bg-[#b9725f]/55" />
              {home.eyebrow}
            </div>

            <div className="max-w-2xl py-14 lg:py-20">
              <BrandMark className="items-start" />
              <h1 className="display mt-9 text-[clamp(3.5rem,7.5vw,7rem)] leading-[0.88] text-[#321f1c]">
                {home.headline}
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[#321f1c]/60 sm:text-lg">
                {home.intro}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href={home.primaryHref}
                  className="inline-flex items-center gap-3 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#60312d]"
                >
                  {home.primaryLabel} <ArrowIcon />
                </Link>
                <Link
                  href={home.secondaryHref}
                  className="rounded-full border border-[#713a35]/18 bg-white/60 px-6 py-3.5 text-sm font-medium text-[#713a35] transition hover:bg-white"
                >
                  {home.secondaryLabel}
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#321f1c]/45">
              {home.featureChips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[470px] p-6 sm:p-9 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,.85),transparent_36%)]" />
            <div className="relative mx-auto flex h-full max-w-[580px] items-center">
              <div className="relative w-full">
                <ProductMedia
                  product={heroProduct}
                  priority
                  className="aspect-[4/5] rounded-[2rem] soft-shadow"
                />
                <div className="absolute -bottom-5 left-5 right-5 rounded-[1.35rem] border border-white/70 bg-white/82 p-5 backdrop-blur-md sm:left-8 sm:right-8">
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/50">
                        Featured protection
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                        Promotional product pricing is shown only when currently supplied by Aloyri CRM.
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
          <section key={section.id} className="shell py-16 md:py-24">
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
            <div className="mb-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
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

      <section className="border-y border-[#713a35]/10 bg-[#f5e8e2]">
        <div className="shell py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/50">
                Build a simple routine
              </p>
              <h2 className="display mt-4 max-w-md text-5xl leading-[0.94] sm:text-6xl">
                Three steps. Less guesswork.
              </h2>
            </div>

            <div className="grid gap-3">
              {routine.map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  className="group grid gap-5 rounded-[1.4rem] border border-[#713a35]/10 bg-white/55 p-5 transition hover:bg-white sm:grid-cols-[52px_1fr_auto] sm:items-center"
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
      </section>

      <section className="shell pb-20 md:pb-28">
        <div className="overflow-hidden rounded-[2rem] bg-[#713a35] text-[#fff8f5]">
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

            <div className="relative min-h-[320px] bg-[#9c5d50]">
              <div className="absolute left-[16%] top-[16%] h-[68%] w-[26%] rotate-[-9deg] rounded-[2rem] border border-white/20 bg-white/12 backdrop-blur" />
              <div className="absolute right-[16%] top-[22%] h-[62%] w-[26%] rotate-[8deg] rounded-[2rem] border border-white/20 bg-white/16 backdrop-blur" />
              <div className="absolute left-1/2 top-1/2 h-[72%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-[#fff8f5] shadow-2xl">
                <div className="rose-metal mx-auto mt-10 h-2 w-16 rounded-full" />
                <div className="mt-16 text-center">
                  <BrandMark compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
