"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { ProductMedia } from "@/components/product-media";
import { formatPrice } from "@/lib/catalog";
import { categoryNamesFromCatalog, matchesCategory } from "@/lib/storefront-categories";
import { useCatalog } from "@/components/catalog-provider";
import { salePriceFor } from "@/lib/promotions";
import { matchesSkinFocus, skinFocusOptions, type SkinFocus } from "@/lib/skin-focus";
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
  initialBrand,
  initialFocus = "all",
  initialStock = "all",
  initialPriceBand = "all",
  initialSort = "recommended",
  searchSynonymGroups = [],
  categoryOrder = [],
  popularSearches = [],
  lockCategory = false,
  merchandisingSortMode = "priority",
}: {
  initialCategory?: string;
  initialQuery?: string;
  initialBrand?: string;
  initialFocus?: SkinFocus;
  initialStock?: StockFilter;
  initialPriceBand?: PriceFilter;
  initialSort?: SortKey;
  searchSynonymGroups?: string[][];
  categoryOrder?: string[];
  popularSearches?: string[];
  lockCategory?: boolean;
  merchandisingSortMode?: "priority" | "featured";
}) {
  const { products, categories: crmCategories, synced, refreshing, error, refresh } = useCatalog();
  const [query, setQuery] = useState(initialQuery || "");
  const [category, setCategory] = useState(initialCategory || "All");
  const [brand, setBrand] = useState(initialBrand || "All");
  const [focus, setFocus] = useState<SkinFocus>(initialFocus);
  const [stock, setStock] = useState<StockFilter>(initialStock);
  const [priceBand, setPriceBand] = useState<PriceFilter>(initialPriceBand);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchTab, setSearchTab] = useState<"all" | "products" | "categories">("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  function readRecentSearches() {
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem("aloyri-recent-searches") || "[]");
      if (Array.isArray(raw)) setRecentSearches(raw.filter((v): v is string => typeof v === "string").slice(0, 5));
    } catch { /* Browsing stays available if session storage is disabled. */ }
  }
  function rememberSearch(value: string) {
    const term = value.trim().slice(0, 80);
    if (!term) return;
    const next = [term, ...recentSearches.filter(v => v.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    setRecentSearches(next);
    try { sessionStorage.setItem("aloyri-recent-searches", JSON.stringify(next)); } catch { /* optional */ }
  }
  useEffect(() => {
    if (!searchFocused) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setSearchFocused(false); searchInputRef.current?.focus({preventScroll: true}); }
    };
    document.addEventListener("keydown", onEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onEscape); };
  }, [searchFocused]);
  useEffect(() => {
    const openFromHeader = () => searchInputRef.current?.focus({ preventScroll: true });
    window.addEventListener("aloyri:open-shop-search", openFromHeader);
    return () => window.removeEventListener("aloyri:open-shop-search", openFromHeader);
  }, []);
  useEffect(() => {
    if (!synced || !searchInputRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("search") !== "1") return;
    searchInputRef.current.focus({ preventScroll: true });
    params.delete("search");
    const next = params.toString();
    window.history.replaceState(window.history.state, "", window.location.pathname + (next ? "?" + next : ""));
  }, [synced]);

  const lastTrackedSearch = useRef("");

  const categories = useMemo(() => {
    const preferredOrder = new Map(
      categoryOrder.map((item, index) => [item.trim().toLocaleLowerCase("en"), index]),
    );
    const entries = categoryNamesFromCatalog(crmCategories, products);
    return entries.sort((a, b) =>
      (preferredOrder.get(a.toLocaleLowerCase("en")) ?? 10_000) -
      (preferredOrder.get(b.toLocaleLowerCase("en")) ?? 10_000) ||
      crmCategories.indexOf(a) - crmCategories.indexOf(b)
    );
  }, [products, crmCategories, categoryOrder]);
  const brands = useMemo(
    () => [...new Set(products.map((product) => product.brand))].sort(),
    [products],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      if (
        product.merchandisingOutOfStockMode === "hide" &&
        (product.availableStock ?? 0) <= 0
      ) {
        continue;
      }
      const normalized = categories.find(item => matchesCategory(item, product.category)) || product.category;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
    return counts;
  }, [products, categories]);

  const suggestions = useMemo(
    () =>
      getSearchSuggestions(
        products.filter(
          (product) =>
            !(
              product.merchandisingOutOfStockMode === "hide" &&
              (product.availableStock ?? 0) <= 0
            ) &&
            (category === "All" || matchesCategory(product.category, category)),
        ),
        query,
        5,
        searchSynonymGroups,
      ),
    [products, category, query, searchSynonymGroups],
  );
  const trendingProducts = useMemo(() => products
    .filter(product => !product.merchandisingHideFromSearch &&
      (product.merchandisingOutOfStockMode !== "hide" || (product.availableStock ?? 0) > 0) &&
      (product.featured || product.bestseller) &&
      (category === "All" || matchesCategory(product.category, category)))
    .slice(0, 4), [products, category]);
  const hasSearchQuery = query.trim().length >= 2;
  const searchCategoryMatches = categories.filter(name =>
    !query.trim() || name.toLowerCase().includes(query.trim().toLowerCase())
  ).slice(0, 8);


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

        if (category !== "All" && !matchesCategory(product.category, category)) return false;
        if (brand !== "All" && product.brand !== brand) return false;
        if (!matchesSkinFocus(product, focus)) return false;

        const available = (product.availableStock ?? 0) > 0;
        if (stock === "in-stock" && !available) return false;
        if (stock === "out-of-stock" && available) return false;

        return matchesPriceBand(salePriceFor(product), priceBand);
      })
      .map((product) => ({
        product,
        searchScore: hasQuery
          ? productSearchScore(product, query, searchSynonymGroups)
          : 0,
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
    focus,
    stock,
    priceBand,
    query,
    sort,
    merchandisingSortMode,
    searchSynonymGroups,
  ]);

  const activeFilterCount =
    Number(brand !== "All") +
    Number(focus !== "all") +
    Number(stock !== "all") +
    Number(priceBand !== "all") +
    Number(!lockCategory && category !== "All");

  useEffect(() => {
    if (lockCategory || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const update = (key: string, value: string, fallback: string) => {
      if (!value || value === fallback) params.delete(key);
      else params.set(key, value);
    };

    update("q", query.trim(), "");
    update("category", category, "All");
    update("brand", brand, "All");
    update("focus", focus, "all");
    update("stock", stock, "all");
    update("price", priceBand, "all");
    update("sort", sort, "recommended");

    const next = params.toString();
    const nextUrl = window.location.pathname + (next ? "?" + next : "");
    const currentUrl = window.location.pathname + window.location.search;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [query, category, brand, focus, stock, priceBand, sort, lockCategory]);

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
    setFocus("all");
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

        <div ref={searchRootRef} className="relative min-h-12 min-w-0 max-w-xl">
          {searchFocused ? (
            <button type="button" tabIndex={-1} aria-label="Close search overlay"
              onClick={() => setSearchFocused(false)}
              className="fixed inset-0 z-[65] cursor-default bg-[#1e1715]/45" />
          ) : null}
          <div className={searchFocused
            ? "fixed inset-x-3 top-3 z-[70] mx-auto max-w-[1360px] rounded-xl border border-[#eee9e5] bg-[#f2f2f2] shadow-lg sm:inset-x-8 sm:top-5"
            : "h-12 rounded-full border border-[#713a35]/14 bg-white"}>
            <div className="flex min-h-12 min-w-0 items-center gap-2 px-3 sm:px-4">
              <button type="button" aria-label="Search products" title="Search"
                onClick={() => {
                  if (searchFocused) { rememberSearch(query); setSearchFocused(false); }
                  else searchInputRef.current?.focus();
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#514944] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <circle cx="10.7" cy="10.7" r="6.3" /><path d="m16 16 4.3 4.3" />
                </svg>
              </button>
              <label htmlFor="storefront-search" className="sr-only">Search skincare</label>
              <input
                id="storefront-search"
                ref={searchInputRef}
                role="combobox"
                aria-haspopup="dialog"
                aria-autocomplete="list"
                aria-expanded={searchFocused}
                aria-controls="storefront-search-panel"
                autoComplete="off"
                value={query}
                onFocus={() => { readRecentSearches(); setSearchFocused(true); }}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") { event.preventDefault(); setSearchFocused(false); }
                  if (event.key === "Enter") { event.preventDefault(); rememberSearch(query); setSearchFocused(false); }
                  if (event.key === "ArrowDown" && searchFocused && suggestions.length) {
                    event.preventDefault();
                    searchRootRef.current?.querySelector<HTMLAnchorElement>('[data-shop-search-option]')?.focus();
                  }
                }}
                placeholder="Search"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[#321f1c] outline-none placeholder:text-[#746f6c]/60"
              />
              {searchFocused ? (
                <button type="button" aria-label="Close search" title="Close search"
                  onClick={() => setSearchFocused(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#514944] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5 19 19M19 5 5 19" />
                  </svg>
                </button>
              ) : query ? (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#514944] hover:bg-black/5">
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>
          </div>
          {searchFocused ? (
            <div id="storefront-search-panel" role="dialog" aria-label="Search discovery"
              className="fixed inset-x-3 top-[76px] z-[70] mx-auto max-h-[min(68vh,490px)] max-w-[1360px] overflow-y-auto rounded-xl border border-[#eee9e5] bg-white p-3 shadow-xl sm:inset-x-8 sm:top-[88px] sm:p-4">
              <div role="tablist" aria-label="Search suggestion categories" className="mb-3 flex gap-1 border-b border-[#713a35]/10 pb-2">
                {(["all", "products", "categories"] as const).map(item => (
                  <button key={item} type="button" role="tab" aria-selected={searchTab === item}
                    onClick={() => setSearchTab(item)}
                    className={"min-h-9 rounded-lg px-3 text-xs font-medium transition-colors " +
                      (searchTab === item ? "bg-[#f5eeea] text-[#713a35]" : "text-[#786964] hover:bg-[#f5eeea]/60")}>
                    {item === "all" ? "All" : item === "products" ? "Products" : "Categories"}
                  </button>
                ))}
              </div>
              {!hasSearchQuery && searchTab !== "categories" && recentSearches.length > 0 ? (
                <section className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#321f1c]">Recent searches</h3>
                    <button type="button" className="text-xs text-[#713a35] underline" onClick={() => {
                      setRecentSearches([]);
                      try { sessionStorage.removeItem("aloyri-recent-searches"); } catch { /* optional */ }
                    }}>Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(term => (
                      <button type="button" key={term} onClick={() => { setQuery(term); searchInputRef.current?.focus(); }}
                        className="rounded-lg border border-[#713a35]/12 px-3 py-2 text-xs text-[#321f1c] hover:bg-[#f5eeea]">{term}</button>
                    ))}
                  </div>
                </section>
              ) : null}
              {!hasSearchQuery && searchTab !== "categories" && popularSearches.length > 0 ? (
                <section className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold text-[#321f1c]">Popular searches</h3>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.slice(0, 6).map(term => (
                      <button type="button" key={term} onClick={() => { setQuery(term); searchInputRef.current?.focus(); }}
                        className="rounded-lg border border-[#713a35]/12 px-3 py-2 text-xs text-[#321f1c] hover:bg-[#f5eeea]">{term}</button>
                    ))}
                  </div>
                </section>
              ) : null}
              {searchTab !== "categories" && (hasSearchQuery ? suggestions : trendingProducts).length > 0 ? (
                <section className="mb-3">
                  <h3 className="mb-2 px-1 text-xs font-semibold text-[#321f1c]">
                    {hasSearchQuery ? "Matching products" : "Featured products"}
                  </h3>
                  <div role="listbox" aria-label="Search suggestions">
                    {(hasSearchQuery ? suggestions : trendingProducts).map(product => (
                      <Link key={product.id} href={"/product/" + product.slug}
                        data-shop-search-option role="option" aria-selected="false"
                        onClick={() => { rememberSearch(query); setSearchFocused(false); }}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#f9f2ee] focus:bg-[#f9f2ee] focus:outline-none">
                        <ProductMedia product={product} className="h-10 w-10 shrink-0 rounded-md" sizes="40px" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#321f1c]">{product.name}</span>
                          <span className="block truncate text-xs text-[#786964]">{product.brand} · {product.category}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-[#713a35]">{formatPrice(salePriceFor(product))}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
              {searchTab !== "products" && searchCategoryMatches.length > 0 && !lockCategory ? (
                <section className="mb-3">
                  <h3 className="mb-2 px-1 text-xs font-semibold text-[#321f1c]">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {searchCategoryMatches.map(name => (
                      <button type="button" key={name} onClick={() => { setCategory(name); setSearchFocused(false); }}
                        className="rounded-lg border border-[#713a35]/12 px-3 py-2 text-xs text-[#321f1c] hover:bg-[#f5eeea]">{name}</button>
                    ))}
                  </div>
                </section>
              ) : null}
              {hasSearchQuery && suggestions.length === 0 && searchCategoryMatches.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[#786964]">No quick matches. Try a different term or view all results.</p>
              ) : null}
              <button type="button" onClick={() => { rememberSearch(query); setSearchFocused(false); }}
                className="w-full border-t border-[#713a35]/10 px-2 py-3 text-left text-xs font-semibold text-[#713a35] hover:bg-[#f9f2ee]">
                {query.trim() ? "See all results for “" + query.trim() + "” →" : "Continue browsing skincare →"}
              </button>
            </div>
          ) : null}
        </div>

        <label className="flex min-w-0 items-center justify-between gap-3 text-xs text-[#321f1c]/50 lg:justify-start">
          Sort
          <select
            aria-label="Sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="h-11 min-w-0 max-w-full rounded-full border border-[#713a35]/14 bg-white px-4 text-sm text-[#321f1c] outline-none"
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

      <nav aria-label="Shop by product focus" className="border-b border-[#713a35]/10 py-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="store-discovery-accent text-[11px] font-semibold uppercase tracking-[.18em]">Explore by focus</p>
          <p className="store-discovery-muted text-xs">Matched from published product descriptions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {skinFocusOptions.map((item) => (
            <button key={item.value} type="button" onClick={() => setFocus(item.value)}
              aria-pressed={focus === item.value} title={item.description}
              className={"store-focus-chip min-h-11 rounded-full border px-4 text-xs font-semibold transition " + (focus === item.value ? "is-selected" : "")}>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <nav aria-label="Shop categories" className="shop-category-rail flex gap-2 overflow-x-auto py-5" tabIndex={0}>
        {!lockCategory
          ? ["All", ...categories].map((item) => {
              const active = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={active}
                  className={`shrink-0 min-h-11 rounded-full border px-4 py-2 text-xs font-medium transition ${
                    active
                      ? "border-[#713a35] bg-[#713a35] text-white"
                      : "border-[#713a35]/12 bg-white/65 text-[#321f1c]/65 hover:border-[#713a35]/30"
                  }`}
                >
                  <span>{item === "All" ? "All skincare" : item}</span>
                  <span
                    className={`ml-1.5 text-[10px] ${
                      active ? "text-white/70" : "text-[#321f1c]/35"
                    }`}
                  >
                    {item === "All"
                      ? [...categoryCounts.values()].reduce(
                          (sum, count) => sum + count,
                          0,
                        )
                      : categoryCounts.get(item) || 0}
                  </span>
                </button>
              );
            })
          : (
              <span className="rounded-full border border-[#713a35] bg-[#713a35] px-4 py-2 text-xs font-medium text-white">
                {initialCategory}
              </span>
            )}
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-[#796762]">{refreshing ? "Refreshing…" : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}</p>
        {activeFilterCount > 0 ? <button type="button" onClick={clearFilters} className="min-h-11 rounded-full border border-[#713a35]/14 px-4 text-xs font-semibold text-[#713a35]">Clear {activeFilterCount} filters</button> : null}
      </div>
      {query.trim() || activeFilterCount > 0 ? (
        <div aria-label="Active shopping filters" className="mb-5 flex flex-wrap items-center gap-2" data-active-discovery-filters>
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#713a35]/65">Your selection</span>
          {query.trim() ? <button type="button" onClick={() => setQuery("")}
            className="shop-active-filter rounded-full border px-3 py-2 text-xs" aria-label={`Remove search: ${query.trim()}`}>Search: {query.trim()} ×</button> : null}
          {!lockCategory && category !== "All" ? <button type="button" onClick={() => setCategory("All")}
            className="shop-active-filter rounded-full border px-3 py-2 text-xs" aria-label={`Remove category: ${category}`}>{category} ×</button> : null}
          {brand !== "All" ? <button type="button" onClick={() => setBrand("All")}
            className="shop-active-filter rounded-full border px-3 py-2 text-xs" aria-label={`Remove brand: ${brand}`}>Brand: {brand} ×</button> : null}
          {focus !== "all" ? <button type="button" onClick={() => setFocus("all")}
            className="shop-active-filter rounded-full border px-3 py-2 text-xs" aria-label="Remove skin focus">Focus: {focus} ×</button> : null}
          {stock !== "all" ? <button type="button" onClick={() => setStock("all")}
            className="shop-active-filter rounded-full border px-3 py-2 text-xs" aria-label="Remove availability filter">Availability: {stock === "in-stock" ? "In stock" : "Out of stock"} ×</button> : null}
          {priceBand !== "all" ? <button type="button" onClick={() => setPriceBand("all")}
            className="shop-active-filter rounded-full border px-3 py-2 text-xs" aria-label="Remove price filter">Price: {priceBand.replace("-", " ")} ×</button> : null}
          <button type="button" onClick={() => { clearFilters(); setQuery(""); }}
            className="min-h-10 rounded-full px-3 text-xs font-semibold text-[#713a35] underline underline-offset-4">Reset discovery</button>
        </div>
      ) : null}
      <details className="mb-7 rounded-2xl border border-[#713a35]/10 bg-white/55" open={brand !== "All" || stock !== "all" || priceBand !== "all" ? true : undefined}>
        <summary className="min-h-12 cursor-pointer px-5 py-4 text-sm font-semibold text-[#713a35]">Filter by brand, availability &amp; price{activeFilterCount > 0 ? ` · ${activeFilterCount} active` : ""}</summary>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-medium text-[#321f1c]/55">
          Brand
          <select
            aria-label="Brand"
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
            aria-label="Availability"
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
            aria-label="Price"
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

        </div>
      </details>

      {filtered.length > 0 ? (
        <div className="storefront-product-grid grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 px-6 py-20 text-center">
          <p className="display text-3xl">{!query.trim() && category !== "All" && !products.some(product => matchesCategory(product.category, category))
            ? "New arrivals coming soon." : "Nothing matched that search."}</p>
          <p className="mt-3 text-sm text-[#321f1c]/50">
            Try another spelling, broaden the filters, or explore a different category.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => { clearFilters(); setQuery(""); }}
              className="min-h-11 rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
              Show all skincare
            </button>
            <Link href="/routine-finder" className="inline-flex min-h-11 items-center rounded-full border border-[#713a35]/20 px-5 py-3 text-sm font-semibold text-[#713a35]">
              Find your routine
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
