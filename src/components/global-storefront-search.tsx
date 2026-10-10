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
        className="absolute inset-0 h-full w-full cursor-default bg-[#241d1a]/40 backdrop-blur-[1.5px]" />

      <div ref={dialogRef} id="global-storefront-search" role="dialog" aria-modal="true"
        aria-label="Search discovery"
        className="global-store-search-dialog absolute inset-x-3 top-3 mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-[820px] flex-col overflow-hidden rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] shadow-[0_30px_90px_rgba(35,23,19,0.22)] sm:inset-x-6 sm:top-[7vh] sm:max-h-[min(82dvh,680px)]">

        <form role="search" aria-label="Search skincare products" onSubmit={submitSearch}
          className="global-store-search-form flex min-h-16 shrink-0 items-center gap-2 border-b border-[var(--store-border)] px-3 transition-colors sm:gap-3 sm:px-5">
          <button type="submit" aria-label="Search all results" title="Search all results"
            onClick={() => { if (!query.trim()) inputRef.current?.focus(); }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--store-accent)] transition-colors hover:bg-[var(--store-panel)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--store-accent)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true">
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
            className="global-store-search-input h-14 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[var(--store-ink)] outline-none placeholder:text-[var(--store-muted)] placeholder:opacity-70 focus-visible:outline-none" />
          {query ? <button type="button" aria-label="Clear query" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="flex min-h-10 shrink-0 items-center rounded-lg px-2 text-xs font-medium text-[var(--store-muted)] transition-colors hover:bg-[var(--store-panel)] hover:text-[var(--store-ink)]">
            Clear
          </button> : null}
          <button type="button" aria-label="Close search" title="Close search (Esc)" onClick={closeSearch}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--store-muted)] transition-colors hover:bg-[var(--store-panel)] hover:text-[var(--store-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--store-accent)]">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19" /></svg>
          </button>
        </form>

        <div id="global-search-suggestions"
          className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-5 sm:pb-4">
          <div role="tablist" aria-label="Search suggestion categories"
            className="sticky top-0 z-10 mb-3 flex gap-5 border-b border-[var(--store-border)] bg-[var(--store-surface)] pt-1 sm:mb-4">
            {(["all", "products", "categories"] as const).map(item => (
              <button key={item} type="button" role="tab" aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={"min-h-11 border-b-2 px-1 text-[13px] font-medium transition-colors " +
                  (tab === item
                    ? "border-[var(--store-accent)] text-[var(--store-ink)]"
                    : "border-transparent text-[var(--store-muted)] hover:text-[var(--store-ink)]")}>
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
            <div className="space-y-4">
              {!hasQuery && tab !== "categories" && recent.length > 0 ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <h3 className="text-xs font-semibold text-[var(--store-muted)]">Recent searches</h3>
                    <button type="button" onClick={() => {
                      setRecent([]);
                      try { sessionStorage.removeItem(recentKey); } catch { /* optional */ }
                    }} className="text-xs font-medium text-[var(--store-accent)] hover:underline">Clear history</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map(term => <button type="button" key={term} onClick={() => { setQuery(term); inputRef.current?.focus(); }}
                      className="min-h-9 rounded-full border border-[var(--store-border)] px-3 text-xs text-[var(--store-ink)] transition-colors hover:bg-[var(--store-panel)]">{term}</button>)}
                  </div>
                </section>
              ) : null}

              {tab !== "categories" && resultProducts.length > 0 ? (
                <section>
                  <div className="mb-1 flex items-center justify-between gap-2 px-1">
                    <h3 className="text-xs font-semibold text-[var(--store-muted)]">{hasQuery ? "Matching products" : "Suggested for you"}</h3>
                  </div>
                  <div role="listbox" aria-label="Search suggestions" className="space-y-0.5">
                    {resultProducts.map(product => (
                      <Link key={product.id} href={"/product/" + product.slug} role="option" aria-selected="false"
                        data-global-search-result
                        onClick={() => { saveRecent(query); setOpen(false); }}
                        onKeyDown={event => {
                          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                            event.preventDefault();
                            const links = Array.from(dialogRef.current?.querySelectorAll<HTMLAnchorElement>("[data-global-search-result]") || []);
                            const index = links.indexOf(event.currentTarget);
                            links[index + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
                            if (index === 0 && event.key === "ArrowUp") inputRef.current?.focus();
                          }
                        }}
                        className="group flex min-h-16 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--store-panel)] focus-visible:bg-[var(--store-panel)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--store-accent)] sm:px-3">
                        <ProductMedia product={product} className="h-12 w-12 shrink-0 rounded-lg border border-[var(--store-border)]" sizes="48px" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--store-ink)] group-hover:text-[var(--store-accent)]">{product.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--store-muted)]">{product.brand} · {product.category}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--store-accent)]">{formatPrice(salePriceFor(product))}</span>
                        <svg className="hidden shrink-0 text-[var(--store-muted)] opacity-0 transition-opacity group-hover:opacity-100 sm:block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {tab !== "products" && matchingCategories.length > 0 ? (
                <section>
                  <h3 className="mb-2 px-1 text-xs font-semibold text-[var(--store-muted)]">Browse categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {matchingCategories.map(item => <Link key={item.slug} href={item.href}
                      onClick={() => setOpen(false)}
                      className="inline-flex min-h-9 items-center rounded-lg border border-[var(--store-border)] px-3 text-xs font-medium text-[var(--store-ink)] transition-colors hover:border-[var(--store-accent)] hover:bg-[var(--store-panel)]">{item.name}<span className="ml-1.5 text-[var(--store-muted)]" aria-hidden="true">↗</span></Link>)}
                  </div>
                </section>
              ) : null}

              {hasQuery && resultProducts.length === 0 && matchingCategories.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[var(--store-muted)]">No quick matches. Try another term or view all products.</p>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--store-border)] px-1 pt-3 text-xs font-medium text-[var(--store-accent)]">
            {query.trim() ? (
              <button type="button" onClick={() => {
                saveRecent(query);
                setOpen(false);
                router.push("/shop?q=" + encodeURIComponent(query.trim()));
              }} className="flex min-h-9 items-center gap-1.5 hover:underline">
                View all results for “{query.trim()}” <span aria-hidden="true">→</span>
              </button>
            ) : (
              <>
                <Link href="/shop?sort=bestseller" onClick={() => setOpen(false)} className="flex min-h-9 items-center hover:underline">Bestsellers <span className="ml-1" aria-hidden="true">→</span></Link>
                <Link href="/shop?stock=in-stock" onClick={() => setOpen(false)} className="flex min-h-9 items-center hover:underline">Available now <span className="ml-1" aria-hidden="true">→</span></Link>
                <Link href="/routine-finder" onClick={() => setOpen(false)} className="flex min-h-9 items-center hover:underline">Find my routine <span className="ml-1" aria-hidden="true">→</span></Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
