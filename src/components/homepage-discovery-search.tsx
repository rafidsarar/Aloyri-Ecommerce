"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ProductMedia } from "@/components/product-media";
import { getSearchSuggestions } from "@/lib/storefront-search";
import { buildCategoryDirectory } from "@/lib/storefront-categories";
import { formatPrice } from "@/lib/catalog";
import { salePriceFor } from "@/lib/promotions";

/**
 * Homepage discovery stays inside the existing Admin-controlled browse block.
 * Prices and stock are displayed only after the live CRM catalog has synced.
 */
export function HomepageDiscoverySearch({
  placeholder,
  synonymGroups,
}: {
  placeholder: string;
  synonymGroups: string[][];
}) {
  const { products, categories, synced } = useCatalog();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => (
    synced
      ? getSearchSuggestions(
          products.filter(product =>
            product.merchandisingOutOfStockMode !== "hide" ||
            (product.availableStock ?? 0) > 0,
          ),
          query, 4, synonymGroups,
        )
      : []
  ), [products, query, synonymGroups, synced]);
  const directory = useMemo(
    () => buildCategoryDirectory(categories, synced ? products : []).slice(0, 5),
    [categories, products, synced],
  );
  const showSuggestions = focused && suggestions.length > 0 && query.trim().length >= 2;

  return (
    <div className="relative min-w-0">
      <form action="/shop" method="get" role="search" aria-label="Search skincare products"
        className="store-home-search flex min-w-0 items-center gap-2 rounded-full border p-1.5 pl-4 sm:pl-5">
        <label htmlFor="home-product-search" className="sr-only">Search products and brands</label>
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" />
        </svg>
        <input ref={inputRef} id="home-product-search" name="q" type="search"
          value={query} onChange={event => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={event => {
            if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget)) setFocused(false);
          }}
          onKeyDown={event => {
            if (event.key === "Escape" && showSuggestions) {
              // The native Escape action on input[type=search] clears the query.
              // Dismissing suggestions must preserve what the customer typed.
              event.preventDefault();
              setFocused(false);
            }
            if (event.key === "ArrowDown" && showSuggestions) {
              event.preventDefault();
              inputRef.current?.closest("div")?.querySelector<HTMLAnchorElement>('[data-home-suggestion]')?.focus();
            }
          }}
          role="combobox" aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="home-discovery-suggestions"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
        <button type="submit" className="store-home-search-button min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold sm:px-6 sm:text-sm">Search</button>
      </form>

      {showSuggestions ? (
        <div id="home-discovery-suggestions" role="listbox" aria-label="Suggested skincare products"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-[#713a35]/15 bg-white p-2 shadow-2xl"
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
          }}>
          <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[.15em] text-[#713a35]/60">Quick product matches</p>
          {suggestions.map(product => (
            <Link key={product.id} href={`/product/${product.slug}`}
              data-home-suggestion role="option" aria-selected="false"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#fff4ef] focus:bg-[#fff4ef] focus:outline-none">
              <ProductMedia product={product} className="h-12 w-12 shrink-0 rounded-lg" sizes="48px" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#321f1c]">{product.name}</span>
                <span className="block truncate text-xs text-[#321f1c]/55">{product.brand} · {product.category}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-[#713a35]">{formatPrice(salePriceFor(product))}</span>
            </Link>
          ))}
          <button type="button" onClick={() => inputRef.current?.form?.requestSubmit()}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#713a35] hover:bg-[#fff4ef]">
            See all results for “{query.trim()}” →
          </button>
        </div>
      ) : null}

      <nav aria-label="Popular ways to browse" className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Link className="store-home-text-link inline-flex min-h-9 items-center" href="/shop?sort=bestseller">Bestsellers →</Link>
        <Link className="store-home-text-link inline-flex min-h-9 items-center" href="/shop?stock=in-stock">Available now →</Link>
        <Link className="store-home-text-link inline-flex min-h-9 items-center" href="/routine-finder">Find my routine →</Link>
      </nav>
      {synced && directory.length > 0 ? (
        <nav aria-label="Quick skincare categories" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {directory.map(item => (
            <Link key={item.slug} href={item.href}
              className="shrink-0 rounded-full border border-[#713a35]/15 bg-white/80 px-3 py-2 text-[11px] font-semibold text-[#713a35] transition hover:border-[#713a35]/45 hover:bg-white">
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
