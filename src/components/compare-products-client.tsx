"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { useCatalog } from "@/components/catalog-provider";
import { ProductMedia } from "@/components/product-media";
import { formatPrice, productStockLabel, type Product } from "@/lib/catalog";
import { hasSalePrice, salePriceFor } from "@/lib/promotions";
import {
  readCompareProductIds,
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  subscribeProductPreferences,
  writeCompareProductIds,
} from "@/lib/product-preferences";

function readable(value: string | undefined | null) {
  return value?.trim() || "Not specified";
}

export function CompareProductsClient() {
  const { products, synced, error, refresh } = useCatalog();
  const [query, setQuery] = useState("");
  useSyncExternalStore(subscribeProductPreferences, productPreferencesSnapshot, productPreferencesServerSnapshot);
  const ids = readCompareProductIds();
  const compared = useMemo(() => {
    const byId = new Map(products.map(product => [product.id, product]));
    return ids.map(id => byId.get(id)).filter((product): product is Product => Boolean(product));
  }, [ids, products]);
  const choices = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return products.filter(product => !ids.includes(product.id) && (!term ||
      [product.name, product.brand, product.category, product.bestFor, product.texture].some(value =>
        value?.toLocaleLowerCase().includes(term))))
      .sort((a, b) => Number((b.availableStock ?? 0) > 0) - Number((a.availableStock ?? 0) > 0))
      .slice(0, 12);
  }, [products, ids, query]);

  useEffect(() => {
    if (synced && ids.length !== compared.length) writeCompareProductIds(compared.map(product => product.id));
  }, [synced, ids, compared]);

  function remove(id: string) {
    writeCompareProductIds(ids.filter(item => item !== id));
  }

  if (!synced) {
    return (
      <main className="shell min-h-[60vh] py-16 text-center">
        <h1 className="display text-5xl">Compare products.</h1>
        <p className="mt-4 text-sm text-[#321f1c]/60" role="status">
          {error ? "Live product information is temporarily unavailable." : "Checking live price and availability…"}
        </p>
        {error ? (
          <button type="button" onClick={() => void refresh()} className="mt-6 rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
            Try again
          </button>
        ) : null}
      </main>
    );
  }

  return (
    <main className="shell pb-16 pt-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#713a35]/10 pb-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/65">Your skincare shortlist</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Compare products.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#321f1c]/65">
            Pick up to three skincare products and see prices, sizes, skin concerns, and routine details together. No account needed.
          </p>
        </div>
        <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full border border-[#713a35]/20 px-5 text-sm font-semibold text-[#713a35] hover:bg-[#f5e8e2]">
          Browse all skincare
        </Link>
      </div>

      <section aria-label="Choose products to compare" className="mt-7 rounded-[1.4rem] border border-[#713a35]/12 bg-white/75 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Choose products <span className="text-sm font-normal text-[#713a35]/60">({compared.length} of 3)</span></h2>
          {ids.length ? (
            <button type="button" onClick={() => writeCompareProductIds([])} className="min-h-11 px-2 text-xs font-semibold text-[#713a35] underline underline-offset-4">Clear all</button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Selected products">
          {[0, 1, 2].map(index => {
            const product = compared[index];
            return (
              <div key={index} className="relative min-w-0 rounded-xl border border-[#713a35]/12 bg-[#fcf5f1] p-2 sm:p-3">
                {product ? (
                  <>
                    <ProductMedia product={product} className="mx-auto aspect-square max-w-[130px] rounded-lg" sizes="130px" />
                    <p className="mt-2 line-clamp-2 min-h-8 text-[11px] font-semibold leading-4 sm:text-xs">{product.name}</p>
                    <button type="button" onClick={() => remove(product.id)} className="mt-2 min-h-9 text-[11px] font-semibold text-[#713a35] underline underline-offset-2" aria-label={"Remove " + product.name + " from comparison"}>Remove</button>
                  </>
                ) : (
                  <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-[#713a35]/60">
                    <span aria-hidden="true" className="text-2xl font-light">+</span>
                    <span className="text-[11px]">Product {index + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <label htmlFor="compare-product-search" className="mt-5 block text-xs font-semibold text-[#321f1c]">Find a product to compare</label>
        <input
          id="compare-product-search"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          disabled={compared.length >= 3}
          placeholder={compared.length >= 3 ? "Remove a product to choose another" : "Search by product, brand, or skin concern"}
          className="mt-2 w-full rounded-xl border border-[#713a35]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#713a35] disabled:opacity-60"
        />
        {compared.length >= 3 ? (
          <p className="mt-2 text-xs text-[#713a35]/65">You have selected three products. Remove one to make a different comparison.</p>
        ) : (
          <div aria-label="Products available to compare" className="mt-3 grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {choices.length ? choices.map(product => (
              <div key={product.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#713a35]/10 bg-[#fffdfb] p-2.5">
                <ProductMedia product={product} className="h-14 w-14 shrink-0 rounded-lg" sizes="56px" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold leading-5">{product.name}</p>
                  <p className="mt-1 text-[11px] text-[#321f1c]/60">{formatPrice(salePriceFor(product))} · {productStockLabel(product)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { writeCompareProductIds([...ids, product.id]); setQuery(""); }}
                  className="min-h-11 shrink-0 rounded-full border border-[#713a35]/20 px-3 text-xs font-semibold text-[#713a35] hover:bg-[#f5e8e2]"
                  aria-label={"Add " + product.name + " to comparison"}
                >+ Add</button>
              </div>
            )) : <p className="py-4 text-sm text-[#321f1c]/55">No matching products. Try another name or brand.</p>}
          </div>
        )}
      </section>

      {compared.length ? (
        <section aria-label="Side-by-side comparison" className="mt-9">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Side-by-side details</h2>
            <p className="text-xs text-[#713a35]/70 sm:hidden">Swipe horizontally to see each product →</p>
          </div>
          <div role="region" aria-label="Scrollable product comparison table" tabIndex={0} style={{ width: "100%", maxWidth: "calc(100vw - 2rem)", overflowX: "auto", contain: "layout paint" }} className="min-w-0 overscroll-x-contain rounded-2xl border border-[#713a35]/15 bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#713a35]">
            <table className="w-full border-collapse text-left text-sm" style={{ minWidth: 130 + compared.length * 220 }}>
              <caption className="sr-only">Compare live prices, availability, and skincare details for selected products.</caption>
              <thead>
                <tr className="bg-[#fbf2ee]">
                  <th scope="col" className="sticky left-0 z-10 w-[130px] min-w-[130px] bg-[#fbf2ee] px-3 py-4 align-top text-xs text-[#713a35]/70 sm:px-4">Details</th>
                  {compared.map(product => (
                    <th scope="col" key={product.id} className="min-w-[220px] border-l border-[#713a35]/10 px-4 py-4 align-top">
                      <Link href={"/product/" + product.slug} className="block text-sm font-semibold text-[#321f1c] underline-offset-4 hover:underline">{product.name}</Link>
                      <span className="mt-1 block text-xs font-normal text-[#321f1c]/55">{product.brand}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ["Live price", (p: Product) => formatPrice(salePriceFor(p))],
                  ["Regular price", (p: Product) => hasSalePrice(p) ? formatPrice(p.price) : "—"],
                  ["Availability", (p: Product) => productStockLabel(p)],
                  ["Category", (p: Product) => readable(p.category)],
                  ["Size", (p: Product) => readable(p.size)],
                  ["Routine step", (p: Product) => readable(p.routineStep)],
                  ["Texture", (p: Product) => readable(p.texture)],
                  ["Best for", (p: Product) => readable(p.bestFor)],
                  ["Skin notes", (p: Product) => readable(p.skinNote)],
                  ["Origin", (p: Product) => readable(p.origin)],
                ] as [string, (p: Product) => string][]).map(([label, getValue]) => (
                  <tr key={label} className="border-t border-[#713a35]/10">
                    <th scope="row" className="sticky left-0 z-10 bg-[#fffaf7] px-3 py-4 align-top text-xs font-semibold text-[#713a35] sm:px-4">{label}</th>
                    {compared.map(product => <td key={product.id} className="border-l border-[#713a35]/10 px-4 py-4 align-top text-xs leading-5 text-[#321f1c]/80">{getValue(product)}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-[#713a35]/10">
                  <th scope="row" className="px-3 py-4 align-top text-xs font-semibold text-[#713a35] sm:px-4">Shop</th>
                  {compared.map(product => (
                    <td key={product.id} className="border-l border-[#713a35]/10 px-3 py-4 align-top">
                      <AddToCart productId={product.id} compact />
                      <Link href={"/product/" + product.slug} className="mt-3 block text-center text-xs font-semibold text-[#713a35] underline underline-offset-2">View details</Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="py-12 text-center">
          <p className="display text-3xl">Your comparison starts here.</p>
          <p className="mt-3 text-sm text-[#321f1c]/60">Choose products above or tap Compare while browsing the shop.</p>
        </div>
      )}
    </main>
  );
}
