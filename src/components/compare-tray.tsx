"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useCatalog } from "@/components/catalog-provider";
import {
  readCompareProductIds,
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  subscribeProductPreferences,
  writeCompareProductIds,
} from "@/lib/product-preferences";

export function CompareTray() {
  const pathname = usePathname();
  const { products, synced } = useCatalog();
  useSyncExternalStore(subscribeProductPreferences, productPreferencesSnapshot, productPreferencesServerSnapshot);
  const selected = readCompareProductIds();
  const available = selected.map(id => products.find(p => p.id === id)).filter((p): p is (typeof products)[number] => Boolean(p));
  useEffect(() => {
    if (synced && selected.length !== available.length) writeCompareProductIds(available.map(product => product.id));
  }, [synced, selected, available]);
  if (!synced || !selected.length || pathname === "/compare" || pathname.startsWith("/checkout") || pathname.startsWith("/admin")) return null;

  return (
    <aside aria-label="Product comparison selection" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#713a35]/20 bg-[#fffaf7]/95 px-4 py-3 text-[#321f1c] shadow-[0_12px_45px_#321f1c24] backdrop-blur-lg sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Compare products <span className="font-normal text-[#713a35]/65">{available.length}/3</span></p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {available.map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => writeCompareProductIds(selected.filter(id => id !== product.id))}
                className="max-w-[170px] truncate text-left text-[11px] text-[#713a35] underline decoration-[#713a35]/25 underline-offset-2"
                aria-label={"Remove " + product.name + " from comparison"}
                title={"Remove " + product.name}
              >
                {product.name} ×
              </button>
            ))}
            {available.length < 3 ? <span className="text-[11px] text-[#321f1c]/45">Add up to {3 - available.length} more</span> : null}
          </div>
        </div>
        <Link href="/compare" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#713a35] px-5 text-xs font-semibold text-white transition hover:bg-[#542824]">
          Compare now <span className="ml-2" aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}
