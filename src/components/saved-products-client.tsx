"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";
import {
  readSavedProductIds,
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  subscribeProductPreferences,
  writeSavedProductIds,
} from "@/lib/product-preferences";

export function SavedProductsClient() {
  const { products, synced, error, refresh } = useCatalog();
  const snapshot = useSyncExternalStore(
    subscribeProductPreferences,
    productPreferencesSnapshot,
    productPreferencesServerSnapshot,
  );
  const ids = useMemo(() => readSavedProductIds(), [snapshot]);

  const saved = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return ids
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [ids, products]);

  if (!synced) {
    return (
      <main className="shell min-h-[60vh] py-16 text-center">
        <h1 className="display text-5xl">Saved products.</h1>
        <p className="mt-4 text-sm text-[#321f1c]/50">
          {error
            ? "Live product information is temporarily unavailable."
            : "Checking live price and availability…"}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-6 rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        ) : null}
      </main>
    );
  }

  return (
    <main className="shell py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#713a35]/10 pb-9">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            Saved on this device
          </p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">Saved products.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#321f1c]/52">
            Saved items stay on this browser only. Live price and stock are always rechecked before purchase.
          </p>
        </div>
        {ids.length ? (
          <button
            type="button"
            onClick={() => writeSavedProductIds([])}
            className="rounded-full border border-[#713a35]/16 px-4 py-2.5 text-xs font-semibold text-[#713a35]"
          >
            Clear saved
          </button>
        ) : null}
      </div>

      {saved.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {saved.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} />
              <button
                type="button"
                onClick={() =>
                  writeSavedProductIds(ids.filter((id) => id !== product.id))
                }
                className="mt-3 text-xs font-semibold text-[#713a35]"
              >
                Remove from saved
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="display text-4xl">Nothing saved yet.</p>
          <p className="mt-3 text-sm text-[#321f1c]/50">
            Save products from any product page to build a shortlist.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-flex rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
          >
            Browse skincare
          </Link>
        </div>
      )}
    </main>
  );
}
