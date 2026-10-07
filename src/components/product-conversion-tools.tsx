"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";
import { trackStorefrontEvent } from "@/lib/analytics";
import { changeSignedInWishlist } from "@/lib/customer-account-sync";
import {
  readCompareProductIds,
  readRecentProductIds,
  readSavedProductIds,
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  subscribeProductPreferences,
  writeCompareProductIds,
  writeRecentProductIds,
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
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const isSaved = saved.includes(productId);
  const isCompared = compare.includes(productId);
  const compareFull = compare.length >= 3 && !isCompared;

  async function toggleSaved() {
    if(saving)return;
    setSaving(true);setError("");
    try {
      await changeSignedInWishlist(productId,!isSaved);
      trackStorefrontEvent(isSaved?"wishlist_remove":"wishlist_add",{productId});
    } catch(reason) {
      if(reason instanceof Error&&reason.message==="SIGN_IN_REQUIRED")router.push("/account?section=wishlist");
      else setError("Unable to save. Please try again.");
    } finally {setSaving(false);}
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
        onClick={()=>void toggleSaved()}
        disabled={saving}
        aria-pressed={isSaved}
        className="rounded-full border border-[#713a35]/16 bg-white/70 px-4 py-3 text-xs font-semibold text-[#713a35] transition hover:bg-white"
      >
        {saving ? "Saving…" : isSaved ? "Saved to account" : "Save to wishlist"}
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
      {error?<p className="col-span-full text-xs text-red-700" role="alert">{error}</p>:null}
      {(saved.length > 0 || compare.length > 0) ? (
        <div className="col-span-full flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1 text-[11px] font-medium text-[#713a35]">
          {saved.length > 0 ? (
            <Link href="/account?section=wishlist">Wishlist · {saved.length}</Link>
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
        <Link href="/account?section=wishlist" className="text-sm font-semibold text-[#713a35]">
          Wishlist
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
