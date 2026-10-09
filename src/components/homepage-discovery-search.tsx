"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [tab, setTab] = useState<"all" | "products" | "categories">("all");
  const [recent, setRecent] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  function readRecentSearches() {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem("aloyri-recent-searches") || "[]");
      if (Array.isArray(saved)) {
        setRecent(saved.filter((v): v is string => typeof v === "string").slice(0, 5));
      }
    } catch { /* Browsing remains available when session storage is blocked. */ }
  }
  useEffect(() => {
    if (!focused) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [focused]);
  function remember(value: string) {
    const term = value.trim().slice(0, 80);
    if (!term) return;
    const next = [term, ...recent.filter(v => v.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    setRecent(next);
    try { sessionStorage.setItem("aloyri-recent-searches", JSON.stringify(next)); } catch { /* optional */ }
  }
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
  const showSuggestions = focused;
  const hasQuery = query.trim().length >= 2;
  const categoryMatches = directory.filter(item => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const featured = synced ? products.filter(p => !p.merchandisingHideFromSearch && (p.featured || p.bestseller) &&
    (p.merchandisingOutOfStockMode !== "hide" || (p.availableStock ?? 0) > 0)).slice(0, 4) : [];

  return (
    <div ref={rootRef} className="relative min-w-0">
      <form action="/shop" method="get" role="search" aria-label="Search skincare products" onSubmit={() => remember(query)}
        className="store-home-search flex min-w-0 items-center gap-2 rounded-full border p-1.5 pl-4 sm:pl-5">
        <label htmlFor="home-product-search" className="sr-only">Search products and brands</label>
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" />
        </svg>
        <input ref={inputRef} id="home-product-search" name="q" type="text" inputMode="search" enterKeyHint="search"
          value={query} onChange={event => setQuery(event.target.value)}
          onFocus={() => { readRecentSearches(); setFocused(true); }}
          onKeyDown={event => {
            if (event.key === "Escape" && showSuggestions) {
              // The native Escape action on input[type=search] clears the query.
              // Dismissing suggestions must preserve what the customer typed.
              event.preventDefault();
              setFocused(false);
            }
            if (event.key === "ArrowDown" && showSuggestions) {
              event.preventDefault();
              rootRef.current?.querySelector<HTMLAnchorElement>('[data-home-suggestion]')?.focus();
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
          className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] p-3 text-[var(--store-ink)] shadow-2xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--store-muted)]">{hasQuery ? "Find your match" : "Discover skincare"}</p>
            <button type="button" onClick={() => setFocused(false)} aria-label="Close search suggestions" className="rounded-full px-3 py-1 text-xs hover:bg-[var(--store-panel)]">Close</button>
          </div>
          <div role="tablist" aria-label="Search suggestion categories" className="mb-3 flex gap-2 overflow-x-auto border-b border-[var(--store-border)] pb-3">
            {(["all", "products", "categories"] as const).map(item => (
              <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}
                className={"shrink-0 rounded-full px-4 py-2 text-xs font-semibold " + (tab === item ? "bg-[var(--store-accent)] text-[var(--store-on-accent)]" : "bg-[var(--store-panel)] text-[var(--store-ink)]")}>
                {item === "all" ? "All" : item === "products" ? "Products" : "Categories"}
              </button>
            ))}
          </div>
          {!hasQuery && tab !== "categories" && recent.length > 0 ? (
            <section className="mb-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold">Recent searches</h3>
                <button type="button" onClick={() => { setRecent([]); try { sessionStorage.removeItem("aloyri-recent-searches"); } catch { /* optional */ } }}
                  className="text-xs text-[var(--store-accent)] underline">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map(item => <button key={item} type="button" onClick={() => { setQuery(item); inputRef.current?.focus(); }}
                  className="rounded-full border border-[var(--store-border)] px-3 py-2 text-xs hover:bg-[var(--store-panel)]">{item}</button>)}
              </div>
            </section>
          ) : null}
          {tab !== "categories" && (hasQuery ? suggestions : featured).length > 0 ? (
            <section className="mb-3">
              <h3 className="px-2 pb-2 text-xs font-semibold">{hasQuery ? "Matching products" : "Featured products"}</h3>
              {(hasQuery ? suggestions : featured).map(product => (
                <Link key={product.id} href={`/product/${product.slug}`} data-home-suggestion role="option" aria-selected="false"
                  onClick={() => { if (hasQuery) remember(query); setFocused(false); }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[var(--store-panel)] focus:bg-[var(--store-panel)] focus:outline-none">
                  <ProductMedia product={product} className="h-12 w-12 shrink-0 rounded-lg" sizes="48px" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{product.name}</span>
                    <span className="block truncate text-xs text-[var(--store-muted)]">{product.brand} · {product.category}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--store-accent)]">{formatPrice(salePriceFor(product))}</span>
                </Link>
              ))}
            </section>
          ) : null}
          {tab !== "products" && categoryMatches.length > 0 ? (
            <section className="mb-3">
              <h3 className="px-2 pb-2 text-xs font-semibold">Browse categories</h3>
              <div className="flex flex-wrap gap-2">
                {categoryMatches.map(item => <Link key={item.slug} href={item.href} onClick={() => setFocused(false)}
                  className="rounded-full border border-[var(--store-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--store-panel)]">{item.name} ↗</Link>)}
              </div>
            </section>
          ) : null}
          {hasQuery && suggestions.length === 0 && categoryMatches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[var(--store-muted)]">No quick matches. Try another term or browse the shop.</p>
          ) : null}
          {hasQuery ? (
            <button type="button" onClick={() => { remember(query); inputRef.current?.form?.requestSubmit(); }}
              className="w-full rounded-xl bg-[var(--store-panel)] px-3 py-3 text-left text-sm font-semibold text-[var(--store-accent)]">
              View all results for “{query.trim()}” →
            </button>
          ) : <Link href="/shop?sort=bestseller" onClick={() => setFocused(false)}
              className="block rounded-xl bg-[var(--store-panel)] px-3 py-3 text-sm font-semibold text-[var(--store-accent)]">Explore bestsellers →</Link>}
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
