"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ProductMedia } from "@/components/product-media";
import { buildCategoryDirectory } from "@/lib/storefront-categories";
import { getSearchSuggestions } from "@/lib/storefront-search";
import { formatPrice } from "@/lib/catalog";
import { salePriceFor } from "@/lib/promotions";

const recentKey = "aloyri-recent-searches";
type SearchTab = "all" | "products" | "categories";

export function GlobalStorefrontSearch({ synonymGroups = [] }: { synonymGroups?: string[][] }) {
  const router = useRouter();
  const { products, categories, synced, refreshing, error, refresh } = useCatalog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  function readRecent() {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(recentKey) || "[]");
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string").slice(0, 5)
        : [];
    } catch {
      return [];
    }
  }

  function saveRecent(term: string) {
    const cleaned = term.trim().slice(0, 80);
    if (!cleaned) return;
    const items = [cleaned, ...readRecent().filter(item => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, 5);
    setRecent(items);
    try { sessionStorage.setItem(recentKey, JSON.stringify(items)); } catch { /* Optional browser history only. */ }
  }

  function closeSearch() {
    setOpen(false);
    window.requestAnimationFrame(() => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    const openSearch = () => {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setQuery("");
      setTab("all");
      setRecent(readRecent());
      setOpen(true);
    };
    window.addEventListener("aloyri:open-global-search", openSearch);
    return () => window.removeEventListener("aloyri:open-global-search", openSearch);
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visibleProducts = useMemo(() => synced
    ? products.filter(product =>
      !product.merchandisingHideFromSearch &&
      (product.merchandisingOutOfStockMode !== "hide" || (product.availableStock ?? 0) > 0))
    : [], [products, synced]);
  const suggestions = useMemo(() => getSearchSuggestions(visibleProducts, query, 6, synonymGroups),
    [visibleProducts, query, synonymGroups]);
  const featured = useMemo(() => {
    const picks = visibleProducts.filter(product => product.featured || product.bestseller);
    return (picks.length ? picks : visibleProducts).slice(0, 4);
  }, [visibleProducts]);
  const directory = useMemo(() => buildCategoryDirectory(categories, visibleProducts).slice(0, 10),
    [categories, visibleProducts]);
  const matchingCategories = directory.filter(item =>
    !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const hasQuery = query.trim().length >= 2;
  const resultProducts = hasQuery ? suggestions : featured;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    saveRecent(term);
    setOpen(false);
    router.push("/shop?q=" + encodeURIComponent(term));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] text-[var(--store-ink)]" data-global-search>
      <button type="button" tabIndex={-1} aria-label="Close search overlay" onClick={closeSearch}
        className="absolute inset-0 h-full w-full cursor-default bg-[#211917]/35 backdrop-blur-[1px]" />
      <div ref={dialogRef} id="global-storefront-search" role="dialog" aria-modal="true"
        aria-label="Search discovery" className="absolute inset-x-3 top-3 mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] shadow-[0_24px_80px_rgba(32,20,16,0.18)] sm:inset-x-8 sm:top-8 sm:max-h-[min(78dvh,650px)]">
        <form role="search" aria-label="Search skincare products" onSubmit={submitSearch}
          className="flex h-14 shrink-0 items-center gap-1 border-b border-[var(--store-border)] bg-[var(--store-surface)] px-3 sm:h-16 sm:px-5">
          <button type="submit" aria-label="Search all results" title="Search all results"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--store-muted)] transition hover:bg-[var(--store-panel)] hover:text-[var(--store-ink)]">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.7" cy="10.7" r="6.3" /><path d="m16 16 4.3 4.3" />
            </svg>
          </button>
          <label htmlFor="global-search-input" className="sr-only">Search skincare</label>
          <input id="global-search-input" ref={inputRef} role="combobox" aria-autocomplete="list"
            aria-expanded="true" aria-controls="global-search-suggestions"
            autoComplete="off" inputMode="search" enterKeyHint="search"
            value={query} onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "ArrowDown") {
                const first = dialogRef.current?.querySelector<HTMLAnchorElement>("[data-global-search-result]");
                if (first) { event.preventDefault(); first.focus(); }
              }
            }}
            placeholder="Search products and brands"
            className="h-12 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-[var(--store-ink)] outline-none placeholder:text-[var(--store-muted)]" />
          {query ? <button type="button" aria-label="Clear query" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="rounded-full px-2 py-2 text-xs text-[var(--store-muted)] hover:bg-[var(--store-panel)]">Clear</button> : null}
          <button type="button" aria-label="Close search" onClick={closeSearch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--store-muted)] transition hover:bg-[var(--store-panel)] hover:text-[var(--store-ink)]">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19" /></svg>
          </button>
        </form>
        <div id="global-search-suggestions"
          className="min-h-0 overflow-y-auto overscroll-contain bg-[var(--store-surface)] px-3 pb-3 pt-1 sm:px-5 sm:pb-4">
          <div role="tablist" aria-label="Search suggestion categories" className="mb-3 flex items-center gap-1 border-b border-[var(--store-border)] py-2">
            {(["all", "products", "categories"] as const).map(item => (
              <button key={item} type="button" role="tab" aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={"min-h-8 rounded-md px-3 text-xs font-medium transition-colors " +
                  (tab === item ? "bg-[var(--store-panel)] text-[var(--store-ink)]" : "text-[var(--store-muted)] hover:bg-[var(--store-panel)]")}>
                {item === "all" ? "All" : item === "products" ? "Products" : "Categories"}
              </button>
            ))}
          </div>
          {!synced ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-4">
              <p className="text-sm text-[var(--store-muted)]">
                {error ? "Live catalog is temporarily unavailable." : refreshing ? "Loading live products…" : "Connecting to live catalog…"}
              </p>
              {error ? <button type="button" onClick={() => void refresh()} className="rounded-lg border border-[var(--store-border)] px-4 py-2 text-xs font-semibold">Retry</button> : null}
            </div>
          ) : (
            <>
              {!hasQuery && tab !== "categories" && recent.length > 0 ? (
                <section className="mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold">Recent searches</h3>
                    <button type="button" onClick={() => {
                      setRecent([]);
                      try { sessionStorage.removeItem(recentKey); } catch { /* optional */ }
                    }} className="text-xs text-[var(--store-accent)] underline">Clear history</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map(term => <button type="button" key={term} onClick={() => { setQuery(term); inputRef.current?.focus(); }}
                      className="rounded-full border border-[var(--store-border)] px-3 py-1.5 text-xs hover:bg-[var(--store-panel)]">{term}</button>)}
                  </div>
                </section>
              ) : null}
              {tab !== "categories" && resultProducts.length > 0 ? (
                <section className="mb-2">
                  <h3 className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--store-muted)]">{hasQuery ? "Matching products" : "Discover products"}</h3>
                  <div role="listbox" aria-label="Search suggestions">
                    {resultProducts.map(product => (
                      <Link key={product.id} href={"/product/" + product.slug} role="option" aria-selected="false"
                        data-global-search-result
                        onClick={() => { saveRecent(query); setOpen(false); }}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--store-panel)] focus:bg-[var(--store-panel)] focus:outline-none">
                        <ProductMedia product={product} className="h-10 w-10 shrink-0 rounded-md" sizes="40px" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{product.name}</span>
                          <span className="block truncate text-xs text-[var(--store-muted)]">{product.brand} · {product.category}</span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-[var(--store-accent)]">{formatPrice(salePriceFor(product))}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
              {tab !== "products" && matchingCategories.length > 0 ? (
                <section className="mb-2">
                  <h3 className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--store-muted)]">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {matchingCategories.map(item => <Link key={item.slug} href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-[var(--store-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--store-panel)]">{item.name} ↗</Link>)}
                  </div>
                </section>
              ) : null}
              {hasQuery && resultProducts.length === 0 && matchingCategories.length === 0 ? (
                <p className="px-2 py-4 text-sm text-[var(--store-muted)]">No quick matches. Try another term or explore all products.</p>
              ) : null}
            </>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--store-border)] px-2 pt-3 text-xs font-medium text-[var(--store-accent)]">
            {query.trim() ? (
              <button type="button" onClick={() => {
                saveRecent(query);
                setOpen(false);
                router.push("/shop?q=" + encodeURIComponent(query.trim()));
              }}>View all results for “{query.trim()}” →</button>
            ) : (
              <>
                <Link href="/shop?sort=bestseller" onClick={() => setOpen(false)}>Bestsellers →</Link>
                <Link href="/shop?stock=in-stock" onClick={() => setOpen(false)}>Available now →</Link>
                <Link href="/routine-finder" onClick={() => setOpen(false)}>Find my routine →</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
