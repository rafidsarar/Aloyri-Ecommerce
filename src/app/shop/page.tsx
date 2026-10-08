import type { Metadata } from "next";
import { VisualPageSections } from "@/components/visual-page-sections";
import Link from "next/link";
import { shopSeoMetadata } from "@/lib/seo-manager";
import { ShopClient } from "@/components/shop-client";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";
import type { SkinFocus } from "@/lib/skin-focus";

const stocks = new Set(["all", "in-stock", "out-of-stock"]);
const focuses = new Set(["all", "hydration", "lightweight", "gentle", "spf"]);
const prices = new Set(["all", "under-600", "600-999", "1000-plus"]);
const sorts = new Set([
  "recommended",
  "bestseller",
  "price-asc",
  "price-desc",
  "name",
]);

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return shopSeoMetadata(config);
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    brand?: string;
    focus?: string;
    stock?: string;
    price?: string;
    sort?: string;
  }>;
}) {
  const [query, config] = await Promise.all([
    searchParams,
    readStorefrontConfig(),
  ]);

  return (
    <>
    <main className="shell py-12 md:py-16">
      <div className="grid gap-4 border-b border-[#713a35]/10 pb-6 lg:grid-cols-[1fr_.7fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            Skincare essentials
          </p>
          <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">
            Shop skincare.
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[#321f1c]/52 lg:justify-self-end">
          Find your next cleanser, moisturizer or sunscreen. Search below,
          choose a category, or filter by brand, price and availability.
        </p>
      </div>

      <nav aria-label="Ways to shop" className="flex flex-wrap items-center gap-3 border-b border-[#713a35]/10 py-5">
        <Link href="/routine-finder" className="store-discovery-button inline-flex min-h-11 items-center rounded-full px-5 text-xs font-semibold">Find your routine →</Link>
        <Link href="/shop?sort=bestseller" className="store-discovery-accent inline-flex min-h-11 items-center rounded-full border border-[#713a35]/15 px-5 text-xs font-semibold">Shop bestsellers</Link>
        <Link href="/shop?stock=in-stock" className="store-discovery-accent inline-flex min-h-11 items-center rounded-full border border-[#713a35]/15 px-5 text-xs font-semibold">Available now</Link>
      </nav>

      <ShopClient
        key={[query.category, query.q, query.brand, query.focus, query.stock, query.price, query.sort].join(":")}
        initialCategory={query.category}
        initialQuery={query.q}
        initialBrand={query.brand}
        initialFocus={focuses.has(query.focus || "") ? (query.focus as SkinFocus) : "all"}
        initialStock={
          stocks.has(query.stock || "")
            ? (query.stock as "all" | "in-stock" | "out-of-stock")
            : "all"
        }
        initialPriceBand={
          prices.has(query.price || "")
            ? (query.price as "all" | "under-600" | "600-999" | "1000-plus")
            : "all"
        }
        initialSort={
          sorts.has(query.sort || "")
            ? (query.sort as
                | "recommended"
                | "bestseller"
                | "price-asc"
                | "price-desc"
                | "name")
            : "recommended"
        }
        searchSynonymGroups={config.merchandising.discovery.synonymGroups}
        categoryOrder={config.merchandising.discovery.categoryOrder}
        popularSearches={config.merchandising.discovery.popularSearches}
        merchandisingSortMode={config.merchandising.shopSortMode}
      />
    </main>
    <VisualPageSections layout={config.visualPages.shop} />
    </>
  );
}
