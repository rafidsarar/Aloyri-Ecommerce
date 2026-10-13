"use client";

import { useSyncExternalStore } from "react";
import {
  readCompareProductIds,
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  subscribeProductPreferences,
  writeCompareProductIds,
} from "@/lib/product-preferences";

export function CompareToggle({ productId, productName }: { productId: string; productName: string }) {
  useSyncExternalStore(
    subscribeProductPreferences,
    productPreferencesSnapshot,
    productPreferencesServerSnapshot,
  );
  const ids = readCompareProductIds();
  const selected = ids.includes(productId);
  const full = ids.length >= 3 && !selected;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? "Remove " + productName + " from comparison" : "Compare " + productName}
      title={full ? "Remove a product from the comparison to add another" : undefined}
      disabled={full}
      onClick={() => writeCompareProductIds(selected ? ids.filter((id) => id !== productId) : [...ids, productId])}
      className={"compare-toggle inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
        (selected ? "border-[#713a35] bg-[#f5e8e2] text-[#713a35]" : "border-[#713a35]/20 bg-white/85 text-[#713a35] hover:border-[#713a35]/60") +
        " disabled:cursor-not-allowed disabled:opacity-50"}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M4 5v14m16-14v14M8 8h8M8 16h8" />
      </svg>
      {selected ? "Selected" : full ? "List full" : "Compare"}
    </button>
  );
}
