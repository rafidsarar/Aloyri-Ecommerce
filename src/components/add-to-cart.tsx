"use client";

import { useState } from "react";
import { useCatalogProduct } from "@/components/catalog-provider";
import { readCart, writeCart } from "@/lib/cart";
import { trackStorefrontEvent } from "@/lib/analytics";

export function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  const { product, synced, error } = useCatalogProduct(productId);
  const available = product?.availableStock ?? 0;

  function add() {
    if (!synced || !product || available <= 0) return;

    const items = readCart();
    const existing = items.find((item) => item.productId === productId);
    const currentQty = existing?.qty ?? 0;

    if (currentQty >= available) return;

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ productId, qty: 1 });
    }

    writeCart(items);
    trackStorefrontEvent("add_to_cart", { productId });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  const disabled = !synced || !product || available <= 0;
  const label = !synced
    ? error
      ? "Stock unavailable"
      : "Checking stock…"
    : !product || available <= 0
      ? "Out of stock"
      : added
        ? "Added to cart"
        : "Add to cart";

  return (
    <>
    <button
      type="button"
      onClick={add}
      disabled={disabled}
      className={`w-full rounded-full px-6 py-4 text-sm font-semibold text-white transition ${
        disabled
          ? "cursor-not-allowed bg-[#713a35]/30"
          : "bg-[#713a35] hover:-translate-y-0.5 hover:bg-[#60312d]"
      }`}
    >
      {label}
    </button>
    <span className="sr-only" aria-live="polite">
      {added ? (product?.name || "Product") + " added to cart." : ""}
    </span>
    </>
  );
}
