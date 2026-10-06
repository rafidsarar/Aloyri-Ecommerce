"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import { salePriceFor } from "@/lib/promotions";
import { safeSearchTerm, trackStorefrontEvent } from "@/lib/analytics";
import {
  getSearchSuggestions,
  productSearchScore,
} from "@/lib/storefront-search";

type SortKey =
  | "recommended"
  | "bestseller"
  | "price-asc"
  | "price-desc"
  | "name";
type StockFilter = "all" | "in-stock" | "out-of-stock";
type PriceFilter = "all" | "under-600" | "600-999" | "1000-plus";

function matchesPriceBand(price: number, band: PriceFilter) {
  if (band === "under-600") return price < 600;
  if (band === "600-999") return price >= 600 && price < 1000;
  if (band === "1000-plus") return price >= 1000;
  return true;
}

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
  const [brand, setBrand] = useState("All");
  const [stock, setStock] = useState<StockFilter>("all");
  const [priceBand, setPriceBand] = useState<PriceFilter>("all");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [searchFocused, setSearchFocused] = useState(false);
  const lastTrackedSearch = useRef("");

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  );
  const brands = useMemo(
    () => [...new Set(products.map((product) => product.brand))].sort(),
    [products],
  );

  const suggestions = useMemo(
    () =>
      getSearchSuggestions(
        products.filter(
          (product) =>
            !(
              product.merchandisingOutOfStockMode === "hide" &&
              (product.availableStock ?? 0) <= 0
            ) &&
            (category === "All" || product.category === category),
        ),
        query,
        5,
      ),
    [products, category, query],
  );

  const filtered = useMemo(() => {
    const hasQuery = query.trim().length > 0;

    const list = products
      .filter((product) => {
        if (
          product.merchandisingOutOfStockMode === "hide" &&
          (product.availableStock ?? 0) <= 0
        ) {
          return false;
        }

        if (category !== "All" && product.category !== category) return false;
        if (brand !== "All" && product.brand !== brand) return false;

        const available = (product.availableStock ?? 0) > 0;
        if (stock === "in-stock" && !available) return false;
        if (stock === "out-of-stock" && available) return false;

        return matchesPriceBand(salePriceFor(product), priceBand);
      })
      .map((product) => ({
        product,
        searchScore: hasQuery ? productSearchScore(product, query) : 0,
      }))
      .filter((row) => !hasQuery || row.searchScore >= 0);

    return [...list]
      .sort((a, b) => {
        if (sort === "price-asc") {
          return salePriceFor(a.product) - salePriceFor(b.product);
        }
        if (sort === "price-desc") {
          return salePriceFor(b.product) - salePriceFor(a.product);
        }
        if (sort === "name") {
          return a.product.name.localeCompare(b.product.name);
        }
        if (sort === "bestseller") {
          const bestseller =
            Number(Boolean(b.product.bestseller)) -
            Number(Boolean(a.product.bestseller));
          if (bestseller !== 0) return bestseller;
        }

        if (
          sort === "recommended" &&
          hasQuery &&
          a.searchScore !== b.searchScore
        ) {
          return b.searchScore - a.searchScore;
        }

        const outOfStockOrder =
          Number(
            a.product.merchandisingOutOfStockMode === "push-down" &&
              (a.product.availableStock ?? 0) <= 0,
          ) -
          Number(
            b.product.merchandisingOutOfStockMode === "push-down" &&
              (b.product.availableStock ?? 0) <= 0,
          );
        if (outOfStockOrder !== 0) return outOfStockOrder;

        if (merchandisingSortMode === "featured") {
          const featured =
            Number(Boolean(b.product.featured)) -
            Number(Boolean(a.product.featured));
          if (featured !== 0) return featured;
        }

        const priority =
          (b.product.merchandisingPriority || 0) -
          (a.product.merchandisingPriority || 0);
        if (priority !== 0) return priority;

        return (
          Number(Boolean(b.product.featured)) -
          Number(Boolean(a.product.featured))
        );
      })
      .map((row) => row.product);
  }, [
    products,
    category,
    brand,
    stock,
    priceBand,
    query,
    sort,
    merchandisingSortMode,
  ]);

  const activeFilterCount =
    Number(brand !== "All") +
    Number(stock !== "all") +
    Number(priceBand !== "all") +
    Number(!lockCategory && category !== "All");

  useEffect(() => {
    if (!synced) return;

    const timer = window.setTimeout(() => {
      const term = safeSearchTerm(query);
      if (!term || term === lastTrackedSearch.current) return;
      lastTrackedSearch.current = term;
      trackStorefrontEvent("search", {
        searchTerm: term,
        resultCount: filtered.length,
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [query, filtered.length, synced]);

  function clearFilters() {
    setBrand("All");
    setStock("all");
    setPriceBand("all");
    if (!lockCategory) setCategory("All");
  }

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
              <div
                key={item}
                className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#f5e8e2]"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 border-b border-[#713a35]/10 py-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="relative max-w-xl">
          <label htmlFor="storefront-search" className="sr-only">
            Search skincare
          </label>
          <input
            id="storefront-search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={searchFocused && suggestions.length > 0}
            aria-controls="storefront-search-suggestions"
            value={query}
            onFocus={() => setSearchFocused(true)}
            onBlur={() =>
              window.setTimeout(() => setSearchFocused(false), 120)
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, brands, routines or textures"
            className="h-12 w-full rounded-full border border-[#713a35]/14 bg-white px-5 pr-12 text-sm outline-none transition placeholder:text-[#321f1c]/35 focus:border-[#b9725f]/60"
          />
          <span className="pointer-events-none absolute right-5 top-6 -translate-y-1/2 text-xs uppercase tracking-[0.16em] text-[#713a35]/45">
            Find
          </span>

          {searchFocused && suggestions.length > 0 ? (
            <div
              id="storefront-search-suggestions"
              role="listbox"
              aria-label="Search suggestions"
              className="absolute left-0 right-0 top-[3.35rem] z-30 overflow-hidden rounded-[1.25rem] border border-[#713a35]/12 bg-white p-2 shadow-xl"
            >
              <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/42">
                Suggested products
              </p>
              {suggestions.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  role="option"
                  aria-selected="false"
                  className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-[#fff4ef] focus:bg-[#fff4ef] focus:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#321f1c]">
                      {product.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#321f1c]/48">
                      {product.brand} · {product.category} · {product.size}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#713a35]/55">
                    View
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <label className="flex items-center gap-3 text-xs text-[#321f1c]/50">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-11 rounded-full border border-[#713a35]/14 bg-white px-4 text-sm text-[#321f1c] outline-none"
          >
            <option value="recommended">
              {query.trim() ? "Recommended / relevant" : "Recommended"}
            </option>
            <option value="bestseller">Bestsellers first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name: A–Z</option>
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
                  aria-pressed={active}
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
      </div>

      <div className="mb-7 grid gap-3 rounded-[1.35rem] border border-[#713a35]/10 bg-white/55 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-medium text-[#321f1c]/55">
          Brand
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="h-11 rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm text-[#321f1c] outline-none"
          >
            <option value="All">All brands</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-medium text-[#321f1c]/55">
          Availability
          <select
            value={stock}
            onChange={(event) => setStock(event.target.value as StockFilter)}
            className="h-11 rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm text-[#321f1c] outline-none"
          >
            <option value="all">Any availability</option>
            <option value="in-stock">In stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-medium text-[#321f1c]/55">
          Price
          <select
            value={priceBand}
            onChange={(event) => setPriceBand(event.target.value as PriceFilter)}
            className="h-11 rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm text-[#321f1c] outline-none"
          >
            <option value="all">Any price</option>
            <option value="under-600">Under ৳600</option>
            <option value="600-999">৳600–999</option>
            <option value="1000-plus">৳1,000+</option>
          </select>
        </label>

        <div className="flex min-h-11 items-center justify-between gap-3 lg:justify-end">
          <span className="text-xs text-[#321f1c]/42">
            {refreshing
              ? "Refreshing…"
              : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
          </span>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-[#713a35]/14 bg-white px-4 py-2 text-xs font-semibold text-[#713a35]"
            >
              Clear {activeFilterCount}
            </button>
          ) : null}
        </div>
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
            Try another spelling, broaden the filters, or browse a different category.
          </p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}
