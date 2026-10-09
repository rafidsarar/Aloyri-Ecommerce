"use client";

import { SearchIcon } from "@/components/icons";

/**
 * The editable homepage browse section launches the same floating search
 * as the header and mobile menu. The catalog remains in the global overlay.
 */
export function HomepageDiscoverySearch({
  placeholder,
}: {
  placeholder: string;
  synonymGroups: string[][];
}) {
  return (
    <div role="search" aria-label="Search skincare products">
      <button type="button"
        onClick={() => window.dispatchEvent(new Event("aloyri:open-global-search"))}
        aria-label="Search products and brands"
        aria-haspopup="dialog"
        aria-controls="global-storefront-search"
        className="store-home-search flex min-h-14 w-full min-w-0 items-center gap-3 rounded-full border px-5 text-left text-sm transition hover:border-[var(--store-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-accent)]">
        <SearchIcon />
        <span className="min-w-0 flex-1 truncate text-[var(--store-muted)]">{placeholder}</span>
        <span className="hidden text-xs font-semibold text-[var(--store-accent)] sm:inline">Search ↗</span>
      </button>
    </div>
  );
}
