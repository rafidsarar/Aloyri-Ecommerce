import Image from "next/image";
import type { HomepageBlockId } from "@/lib/homepage-builder";
import type { HomepageMerchandisingSection, StorefrontConfig } from "@/lib/storefront-admin-store";
import { safeHomepageImagePath } from "@/lib/homepage-builder";
import { getVerifiedProductContent } from "@/lib/product-verification";

/** Public catalog fields only. No CRM, customer, payment or admin credentials reach the client. */
export type BuilderPreviewProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice?: number;
  availableStock: number;
  mediaPath?: string;
};

export type BuilderPreviewCampaign = {
  id: string;
  title: string;
  copy: string;
  eyebrow: string;
  badgeText: string;
  imagePath: string;
  enabled: boolean;
};

type Home = StorefrontConfig["homepage"];

export type BuilderPreviewData = {
  homepage: Home;
  products: BuilderPreviewProduct[];
  sections: HomepageMerchandisingSection[];
  campaigns: BuilderPreviewCampaign[];
  showRoutine: boolean;
};

function mediaSrc(path: string | undefined): string | null {
  if (!path || !safeHomepageImagePath(path)) return null;
  return "/api/storefront-media/" + path.slice("media/".length);
}

function PreviewMedia({ path, alt, className = "", productId }: { path?: string; alt: string; className?: string; productId?: string }) {
  const src = mediaSrc(path) || (productId ? getVerifiedProductContent(productId)?.photo?.src : null);
  if (!src) return null;
  return <div className={`relative overflow-hidden ${className}`}>
    <Image unoptimized src={src} alt={alt} fill sizes="(max-width: 768px) 70vw, 400px" className="object-cover" />
  </div>;
}

function Heading({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return <div className="mb-5">
    {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#98564f]">{eyebrow}</p>}
    <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#392621]">{title}</h3>
    {intro && <p className="mt-2 text-sm leading-6 text-[#604d47]">{intro}</p>}
  </div>;
}

function ProductTiles({ products }: { products: BuilderPreviewProduct[] }) {
  if (!products.length) return <p className="rounded-xl border border-dashed border-black/10 p-5 text-sm text-[#80645b]">No products are currently available for this section.</p>;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {products.slice(0, 6).map(product => <div key={product.id} className="min-w-0 overflow-hidden rounded-xl border border-[#eadbd4] bg-white">
      <div className="relative flex aspect-square items-center justify-center bg-[#f7ede8]">
        {mediaSrc(product.mediaPath) || getVerifiedProductContent(product.id)?.photo?.src
          ? <PreviewMedia path={product.mediaPath} productId={product.id} alt={product.name} className="absolute inset-0" />
          : <span className="px-2 text-center text-xs font-bold tracking-wide text-[#805951]">{product.brand}</span>}
      </div>
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase text-[#8d6960]">{product.brand}</p>
        <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#392621]">{product.name}</p>
        <p className="mt-1 text-xs font-bold text-[#713a35]">৳{(product.salePrice || product.price).toLocaleString("en-BD")}</p>
        {product.availableStock <= 0 && <span className="text-[10px] text-[#99534b]">Out of stock</span>}
      </div>
    </div>)}
  </div>;
}

function PromoPanels({ home }: { home: Home }) {
  const now = Date.now();
  const banners = home.promoBanners.filter(banner => {
    if (!banner.enabled || !banner.title.trim()) return false;
    const start = banner.startAt ? Date.parse(banner.startAt + ":00+06:00") : 0;
    const end = banner.endAt ? Date.parse(banner.endAt + ":00+06:00") : Infinity;
    return Number.isFinite(start) && (end === Infinity || Number.isFinite(end)) && start < end && now >= start && now < end;
  });
  if (!banners.length) return null;
  return <div className="space-y-3">
    {banners.map((banner, index) => <div key={index} className="grid overflow-hidden rounded-2xl border border-[#e5cfc7] bg-[#f2e2dc] sm:grid-cols-2">
      <div className="p-5">
        <Heading eyebrow={banner.eyebrow} title={banner.title} intro={banner.copy} />
        {banner.ctaLabel && <span className="inline-flex rounded-full bg-[#713a35] px-4 py-2 text-xs font-semibold text-white">{banner.ctaLabel}</span>}
      </div>
      {mediaSrc(banner.imagePath)
        ? <PreviewMedia path={banner.imagePath} alt={banner.title} className="min-h-36" />
        : <div className="grid min-h-36 place-items-center bg-[#d9b6aa] text-xl font-semibold text-white">Aloyri</div>}
    </div>)}
  </div>;
}

function EditorialPanels({ home, position }: { home: Home; position: Home["editorialSections"][number]["position"] }) {
  const sections = home.editorialSections.filter(item => item.enabled && item.title && item.position === position);
  if (!sections.length) return null;
  return <div className="space-y-3">
    {sections.map((item, index) => <div key={index} className={`rounded-2xl border border-[#e9dcd6] bg-white p-5 ${item.layout === "centered" ? "text-center" : ""}`}>
      <Heading eyebrow={item.eyebrow} title={item.title} intro={item.copy} />
      {item.ctaLabel && <span className="inline-flex rounded-full border border-[#713a35]/30 px-4 py-2 text-xs font-semibold text-[#713a35]">{item.ctaLabel}</span>}
    </div>)}
  </div>;
}

/**
 * Existing sections in the unsaved canvas show their real saved copy, images,
 * promotions and catalog items, updated by pending builder edits. The public
 * homepage remains authoritative for final styling, dynamic data and behavior.
 */
export function StorefrontCorePreview({ section, data }: { section: HomepageBlockId; data: BuilderPreviewData }) {
  const { homepage: home, products, sections, campaigns } = data;
  if (section === "hero") {
    return <div className={`overflow-hidden rounded-2xl border border-[#dbc5bc] ${home.heroStyle === "contrast" ? "bg-[#51312b] text-white" : home.heroStyle === "minimal" ? "bg-white" : "bg-[#f3e2dc]"}`}>
      <div className={home.heroLayout === "split" ? "grid sm:grid-cols-2" : "grid"}>
        <div className={`p-6 sm:p-8 ${home.heroAlignment === "center" ? "text-center" : ""}`}>
          <p className="text-[10px] font-bold uppercase tracking-[.17em] opacity-70">{home.eyebrow}</p>
          <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">{home.headline}</h3>
          <p className="mt-3 text-sm leading-6 opacity-75">{home.intro}</p>
          <div className={`mt-5 flex flex-wrap gap-2 ${home.heroAlignment === "center" ? "justify-center" : ""}`}>
            {home.primaryLabel && <span className="rounded-full bg-[#713a35] px-4 py-2 text-xs font-semibold text-white">{home.primaryLabel}</span>}
            {home.secondaryLabel && <span className="rounded-full border border-current/25 px-4 py-2 text-xs font-semibold">{home.secondaryLabel}</span>}
          </div>
          {!!home.featureChips.length && <div className="mt-6 flex flex-wrap gap-2">{home.featureChips.map((chip, i) => <span key={i} className="rounded-full border border-current/15 px-2 py-1 text-[10px]">{chip}</span>)}</div>}
        </div>
        {mediaSrc(home.heroImagePath) || products.some(p => p.id === home.heroProductId && (mediaSrc(p.mediaPath) || getVerifiedProductContent(p.id)?.photo?.src))
          ? <PreviewMedia path={home.heroImagePath || products.find(p => p.id === home.heroProductId)?.mediaPath} productId={home.heroProductId} alt={home.headline} className="min-h-48" />
          : <div className="grid min-h-48 place-items-center bg-[#e2c0b5] text-xl font-semibold text-[#713a35]">ALOYRI</div>}
      </div>
    </div>;
  }
  if (section === "browse") return <div className="rounded-2xl bg-white p-6">
    <Heading eyebrow={home.browseEyebrow} title={home.browseTitle} intro={home.browseIntro} />
    <div className="rounded-full border border-[#decac1] bg-[#fffaf8] px-5 py-3 text-sm text-[#9b8177]">{home.browsePlaceholder || "Search skincare…"}</div>
    <div className="mt-4 flex flex-wrap gap-2">{["Shop all", "Cleansers", "Moisturizers", "Sunscreen"].map(x => <span key={x} className="rounded-full bg-[#f5e9e4] px-3 py-2 text-xs text-[#713a35]">{x}</span>)}</div>
  </div>;
  if (section === "categories") return <div className="rounded-2xl bg-white p-6">
    <Heading eyebrow={home.categoriesEyebrow} title={home.categoriesTitle} intro={home.categoriesIntro} />
    <div className="grid grid-cols-3 gap-2">
      {(["Cleanser", "Moisturizer", "Sunscreen"] as const).map((category, index) => {
        const product = products.find(p => p.category.toLowerCase() === category.toLowerCase() && p.availableStock > 0);
        return <div key={category} className="min-w-0 rounded-xl bg-[#f2e6df] p-2">
          <div className="relative mb-2 grid aspect-square place-items-center rounded-lg bg-[#e5cec4]">
            {product && (mediaSrc(product.mediaPath) || getVerifiedProductContent(product.id)?.photo?.src) ? <PreviewMedia path={product.mediaPath} productId={product.id} alt={product.name} className="absolute inset-0" /> : <span className="text-xl text-[#713a35]">0{index + 1}</span>}
          </div>
          <p className="text-xs font-semibold text-[#713a35]">{category === "Cleanser" ? "Cleansers" : category === "Moisturizer" ? "Moisturizers" : "Sunscreen"}</p>
        </div>;
      })}
    </div>
  </div>;
  if (section === "focus") return <div className="rounded-2xl bg-[#f7eee9] p-6">
    <Heading eyebrow="Find your focus" title="Skincare for your everyday routine" intro="Explore cleansing, hydration and daily sun protection." />
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{["Cleanse", "Hydrate", "Protect"].map(x => <div key={x} className="rounded-xl border border-[#dfc9bf] bg-white p-4 text-sm font-semibold text-[#713a35]">{x} →</div>)}</div>
  </div>;
  if (section === "routineFinder") return <div className="rounded-2xl bg-[#f5ebe4] p-6">
    <Heading eyebrow="Find your routine" title={home.routineFinderHeadline} intro={home.routineFinderIntro} />
    <div className="grid gap-2 sm:grid-cols-3">{["Tell us about your skin", "Choose your priority", "Explore the edit"].map((x,i) => <div key={x} className="rounded-xl border border-[#dbc6bd] bg-white p-4 text-xs font-semibold text-[#713a35]"><span className="mr-2 opacity-60">0{i+1}</span>{x}</div>)}</div>
  </div>;
  if (section === "editorialBeforeProducts") return <EditorialPanels home={home} position="before-products" />;
  if (section === "editorialAfterProducts") return <EditorialPanels home={home} position="after-products" />;
  if (section === "editorialBeforeStory") return <EditorialPanels home={home} position="before-story" />;
  if (section === "promoBeforeProducts") return home.promoPlacement === "before-products" ? <PromoPanels home={home} /> : null;
  if (section === "promoAfterProducts") return home.promoPlacement === "after-products" ? <PromoPanels home={home} /> : null;
  if (section === "products") return <div className="space-y-5">
    {sections.filter(s => s.enabled).map(s => {
      const campaign = s.kind === "campaign" ? campaigns.find(c => c.id === s.referenceId && c.enabled) : null;
      const title = s.title || campaign?.title || "Discover skincare";
      if (s.kind === "campaign" && !campaign) return null;
      const listing = s.kind === "bestsellers" ? [...products].sort((a,b) => b.availableStock - a.availableStock) : products;
      return <div key={s.id} className="rounded-2xl bg-white p-5">
        <Heading eyebrow={s.eyebrow || campaign?.eyebrow} title={title} intro={s.copy || campaign?.copy} />
        {campaign?.imagePath && mediaSrc(campaign.imagePath) && <PreviewMedia path={campaign.imagePath} alt={title} className="mb-4 h-36 rounded-xl" />}
        <ProductTiles products={listing.slice(0, Math.min(6, s.maxProducts))} />
      </div>;
    })}
    {!sections.some(s => s.enabled) && <div className="rounded-xl border border-dashed border-[#d6c2b8] bg-white p-5 text-xs text-[#755a53]">No homepage product collections are enabled in merchandising.</div>}
  </div>;
  if (section === "routineSteps") return data.showRoutine ? <div className="rounded-2xl bg-[#f5e8e2] p-6">
    <Heading eyebrow="Build a simple routine" title="Three steps. Less guesswork." />
    <div className="grid gap-2 sm:grid-cols-3">{["Cleanse", "Moisturize", "Protect"].map((x,i)=><div key={x} className="rounded-xl border border-[#dac9c1] bg-white p-4"><span className="text-xs text-[#98564f]">0{i+1}</span><p className="mt-2 text-sm font-semibold">{x}</p></div>)}</div>
  </div> : null;
  if (section === "brandStory") return <div className="grid overflow-hidden rounded-2xl bg-[#713a35] text-white sm:grid-cols-[1.2fr_.8fr]">
    <div className="p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[.2em] text-white/65">{home.ideaEyebrow}</p>
      <h3 className="mt-4 text-3xl font-semibold leading-tight">{home.ideaHeadline}</h3>
      <p className="mt-3 text-sm leading-6 text-white/75">{home.ideaCopy}</p>
      <span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#713a35]">Browse skincare</span>
    </div>
    <div className="grid min-h-36 place-items-center bg-[#a56c5f] text-xl font-semibold tracking-wide">ALOYRI</div>
  </div>;
  return null;
}
