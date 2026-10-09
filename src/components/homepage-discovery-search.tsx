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
    <div ref={rootRef} className={"relative min-w-0 " + (focused ? "z-[70]" : "")}>
      {focused ? (
        <button type="button" tabIndex={-1} aria-label="Close search overlay" onClick={() => setFocused(false)}
          className="fixed inset-0 z-0 cursor-default bg-black/45" />
      ) : null}
      <form action="/shop" method="get" role="search" aria-label="Search skincare products" onSubmit={() => remember(query)}
        className={"store-home-search flex min-w-0 items-center gap-3 border px-4 py-2 shadow-none transition-all sm:px-5 " +
          (focused
            ? "fixed inset-x-3 top-3 z-10 mx-auto max-w-[1360px] rounded-xl border-transparent bg-[var(--store-surface)] shadow-sm sm:inset-x-8 sm:top-5"
            : "rounded-full focus-within:border-[var(--store-accent)]")}>
        <label htmlFor="home-product-search" className="sr-only">Search products and brands</label>
        <button type="submit" aria-label="Search" title="Search"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--store-ink)] transition hover:bg-[var(--store-panel)] focus-visible:outline-2 focus-visible:outline-offset-2">
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" />
          </svg>
        </button>
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
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:opacity-65" />
        {focused ? (
          <button type="button" aria-label="Close" onClick={() => setFocused(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--store-muted)] hover:bg-[var(--store-panel)] focus-visible:outline-2 focus-visible:outline-offset-2"
            title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5 19 19M19 5 5 19" />
            </svg>
          </button>
        ) : null}
      </form>

      {showSuggestions ? (
        <div id="home-discovery-suggestions" role="listbox" aria-label="Suggested skincare products"
          className="fixed inset-x-3 top-[76px] z-10 mx-auto max-h-[min(65vh,440px)] max-w-[1360px] overflow-y-auto rounded-xl border border-[var(--store-border)] bg-[var(--store-surface)] p-3 text-[var(--store-ink)] shadow-lg sm:inset-x-8 sm:top-[88px]">
          <div role="tablist" aria-label="Search suggestion categories" className="mb-2 flex items-center gap-1 overflow-x-auto border-b border-[var(--store-border)] pb-2">
            {(["all", "products", "categories"] as const).map(item => (
              <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}
                className={"shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " + (tab === item ? "bg-[var(--store-panel)] text-[var(--store-ink)]" : "text-[var(--store-muted)] hover:bg-[var(--store-panel)]") }>
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
                  className="rounded-md border border-[var(--store-border)] px-3 py-1.5 text-xs hover:bg-[var(--store-panel)]">{item}</button>)}
              </div>
            </section>
          ) : null}
          {tab !== "categories" && (hasQuery ? suggestions : featured).length > 0 ? (
            <section className="mb-3">
              <h3 className="px-2 pb-2 text-xs font-semibold">{hasQuery ? "Matching products" : "Featured products"}</h3>
              {(hasQuery ? suggestions : featured).map(product => (
                <Link key={product.id} href={`/product/${product.slug}`} data-home-suggestion role="option" aria-selected="false"
                  onClick={() => { if (hasQuery) remember(query); setFocused(false); }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--store-panel)] focus:bg-[var(--store-panel)] focus:outline-none">
                  <ProductMedia product={product} className="h-10 w-10 shrink-0 rounded-md" sizes="40px" />
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
                  className="rounded-md border border-[var(--store-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--store-panel)]">{item.name} ↗</Link>)}
              </div>
            </section>
          ) : null}
          {hasQuery && suggestions.length === 0 && categoryMatches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[var(--store-muted)]">No quick matches. Try another term or browse the shop.</p>
          ) : null}
          {hasQuery ? (
            <button type="button" onClick={() => { remember(query); inputRef.current?.form?.requestSubmit(); }}
              className="w-full border-t border-[var(--store-border)] px-2 pt-3 pb-1 text-left text-xs font-semibold text-[var(--store-accent)]">
              View all results for “{query.trim()}” →
            </button>
          ) : (
            <nav aria-label="Quick shopping shortcuts"
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--store-border)] px-2 pt-3 pb-1 text-xs font-semibold text-[var(--store-accent)]">
              <Link href="/shop?sort=bestseller" onClick={() => setFocused(false)}>Bestsellers</Link>
              <Link href="/shop?stock=in-stock" onClick={() => setFocused(false)}>Available now</Link>
              <Link href="/routine-finder" onClick={() => setFocused(false)}>Find my routine</Link>
            </nav>
          )}
        </div>
      ) : null}


    </div>
  );
}
