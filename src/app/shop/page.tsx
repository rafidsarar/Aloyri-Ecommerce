import type { Metadata } from "next";
import { VisualPageSections } from "@/components/visual-page-sections";
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
    <main className="shell py-8 md:py-11">
      <header className="border-b border-[#713a35]/10 pb-5 md:pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#713a35]/50">
          The Aloyri collection
        </p>
        <h1 className="display mt-2 text-4xl leading-tight sm:text-5xl">
          Shop skincare.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#321f1c]/55">
          Discover your everyday skincare essentials.
        </p>
      </header>

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
