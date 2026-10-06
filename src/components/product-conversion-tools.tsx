"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";
import {
  readCompareProductIds,
  readRecentProductIds,
  readSavedProductIds,
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  subscribeProductPreferences,
  writeCompareProductIds,
  writeRecentProductIds,
  writeSavedProductIds,
} from "@/lib/product-preferences";

function usePreferenceCounts() {
  useSyncExternalStore(
    subscribeProductPreferences,
    productPreferencesSnapshot,
    productPreferencesServerSnapshot,
  );
  return {
    saved: readSavedProductIds(),
    compare: readCompareProductIds(),
  };
}

export function ProductPreferenceButtons({ productId }: { productId: string }) {
  const { saved, compare } = usePreferenceCounts();
  const isSaved = saved.includes(productId);
  const isCompared = compare.includes(productId);
  const compareFull = compare.length >= 3 && !isCompared;

  function toggleSaved() {
    writeSavedProductIds(
      isSaved ? saved.filter((id) => id !== productId) : [productId, ...saved],
    );
  }

  function toggleCompare() {
    if (compareFull) return;
    writeCompareProductIds(
      isCompared
        ? compare.filter((id) => id !== productId)
        : [...compare, productId],
    );
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={toggleSaved}
        aria-pressed={isSaved}
        className="rounded-full border border-[#713a35]/16 bg-white/70 px-4 py-3 text-xs font-semibold text-[#713a35] transition hover:bg-white"
      >
        {isSaved ? "Saved for later" : "Save for later"}
      </button>
      <button
        type="button"
        onClick={toggleCompare}
        disabled={compareFull}
        aria-pressed={isCompared}
        className="rounded-full border border-[#713a35]/16 bg-white/70 px-4 py-3 text-xs font-semibold text-[#713a35] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCompared
          ? "Added to compare"
          : compareFull
            ? "Compare list full"
            : "Compare product"}
      </button>
      {(saved.length > 0 || compare.length > 0) ? (
        <div className="col-span-full flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1 text-[11px] font-medium text-[#713a35]">
          {saved.length > 0 ? (
            <Link href="/saved">Saved products · {saved.length}</Link>
          ) : null}
          {compare.length > 0 ? (
            <Link href="/compare">Compare · {compare.length}/3</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function RecentlyViewedProducts({
  currentProductId,
}: {
  currentProductId: string;
}) {
  const { products, synced } = useCatalog();
  useSyncExternalStore(
    subscribeProductPreferences,
    productPreferencesSnapshot,
    productPreferencesServerSnapshot,
  );
  const recentIds = readRecentProductIds()
    .filter((id) => id !== currentProductId)
    .slice(0, 4);

  useEffect(() => {
    const previous = readRecentProductIds().filter(
      (id) => id !== currentProductId,
    );
    writeRecentProductIds([currentProductId, ...previous]);
  }, [currentProductId]);

  const recentProducts = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return recentIds
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [products, recentIds]);

  if (!synced || recentProducts.length === 0) return null;

  return (
    <section className="mt-20 border-t border-[#713a35]/10 pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            Recently viewed
          </p>
          <h2 className="display mt-2 text-4xl">Pick up where you left off.</h2>
        </div>
        <Link href="/saved" className="text-sm font-semibold text-[#713a35]">
          Saved products
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {recentProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
