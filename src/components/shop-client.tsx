"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import { salePriceFor } from "@/lib/promotions";

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

export function ShopClient({
  initialCategory,
  initialQuery,
  lockCategory = false,
  merchandisingSortMode = "priority",
}: {
  initialCategory?: string;
  initialQuery?: string;
  lockCategory?: boolean;
  merchandisingSortMode?: "priority" | "featured";
}) {
  const { products, synced, refreshing, error, refresh } = useCatalog();
  const [query, setQuery] = useState(initialQuery || "");
  const [category, setCategory] = useState(initialCategory || "All");
  const [sort, setSort] = useState<SortKey>("featured");

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const list = products.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [product.name, product.brand, product.category, product.size]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });

    return [...list].sort((a, b) => {
      if (sort === "price-asc") return salePriceFor(a) - salePriceFor(b);
      if (sort === "price-desc") return salePriceFor(b) - salePriceFor(a);
      if (sort === "name") return a.name.localeCompare(b.name);
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }, [products, category, query, sort, merchandisingSortMode]);

  if (!synced) {
    return (
      <div className="py-14">
        {error ? (
          <div className="rounded-[1.5rem] border border-[#713a35]/10 bg-[#fff4ef] p-7 text-center">
            <p className="display text-3xl">Live catalog is temporarily unavailable.</p>
            <p className="mt-3 text-sm text-[#321f1c]/50">
              Prices and stock are not shown until the CRM can be refreshed safely.
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-6 rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#f5e8e2]" />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 border-b border-[#713a35]/10 py-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="relative block max-w-xl">
          <span className="sr-only">Search skincare</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product or brand"
            className="h-12 w-full rounded-full border border-[#713a35]/14 bg-white px-5 pr-12 text-sm outline-none transition placeholder:text-[#321f1c]/35 focus:border-[#b9725f]/60"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs uppercase tracking-[0.16em] text-[#713a35]/45">
            Find
          </span>
        </label>

        <label className="flex items-center gap-3 text-xs text-[#321f1c]/50">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-11 rounded-full border border-[#713a35]/14 bg-white px-4 text-sm text-[#321f1c] outline-none"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 py-6">
        {!lockCategory
          ? ["All", ...categories].map((item) => {
          const active = category === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                active
                  ? "border-[#713a35] bg-[#713a35] text-white"
                  : "border-[#713a35]/12 bg-white/65 text-[#321f1c]/65 hover:border-[#713a35]/30"
              }`}
            >
              {item === "All" ? "All skincare" : item}
            </button>
            );
          })
          : (
              <span className="rounded-full border border-[#713a35] bg-[#713a35] px-4 py-2 text-xs font-medium text-white">
                {initialCategory}
              </span>
            )}
        <span className="ml-auto hidden text-xs text-[#321f1c]/40 sm:block">
          {refreshing ? "Refreshing…" : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 px-6 py-20 text-center">
          <p className="display text-3xl">Nothing matched that search.</p>
          <p className="mt-3 text-sm text-[#321f1c]/50">
            Try a product name, brand or another category.
          </p>
        </div>
      )}
    </>
  );
}
