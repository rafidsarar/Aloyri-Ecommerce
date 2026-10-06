import type { Metadata } from "next";
import { shopSeoMetadata } from "@/lib/seo-manager";
import { ShopClient } from "@/components/shop-client";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

const stocks = new Set(["all", "in-stock", "out-of-stock"]);
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
    <main className="shell py-12 md:py-16">
      <div className="grid gap-8 border-b border-[#713a35]/10 pb-10 lg:grid-cols-[1fr_.7fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            The Aloyri edit
          </p>
          <h1 className="display mt-3 text-6xl leading-[0.92] sm:text-7xl">
            Shop skincare.
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[#321f1c]/52 lg:justify-self-end">
          Cleanse, moisturize and protect with a focused collection priced in
          BDT. Search by product, brand, routine or texture, then refine by
          category, stock and price.
        </p>
      </div>

      <ShopClient
        initialCategory={query.category}
        initialQuery={query.q}
        initialBrand={query.brand}
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
  );
}
