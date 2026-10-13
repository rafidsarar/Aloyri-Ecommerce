"use client";
import { volatileStorage } from "@/lib/volatile-storage";
import { HERO_BANNER_CLAIM_KEY, claimOffer, type HeroBannerOffer } from "@/lib/hero-banner-offers";

import { useState, useSyncExternalStore } from "react";
import { useCatalogProduct } from "@/components/catalog-provider";
import { CART_UPDATED_EVENT, readCart, writeCart } from "@/lib/cart";
import { trackStorefrontEvent } from "@/lib/analytics";

function subscribeCart(listener: () => void) {
  window.addEventListener(CART_UPDATED_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function AddToCart({
  productId,
  compact = false,
  ariaLabel,
  bannerOffer,
  showQuantity = false,
}: {
  productId: string;
  compact?: boolean;
  ariaLabel?: string;
  bannerOffer?: HeroBannerOffer;
  showQuantity?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const { product, synced, error } = useCatalogProduct(productId);
  const available = Math.min(99, product?.availableStock ?? 0);
  const [quantity, setQuantity] = useState(1);
  const inCart = useSyncExternalStore(subscribeCart,
    () => readCart().find(item => item.productId === productId)?.qty ?? 0,
    () => 0);
  const remaining = Math.max(0, available - inCart);
  const selected = Math.max(1, Math.min(quantity, remaining));

  function add() {
    if (!synced || !product || available <= 0) return;

    const items = readCart();
    const existing = items.find((item) => item.productId === productId);
    const currentQty = existing?.qty ?? 0;

    const amount = showQuantity ? selected : 1;
    if (currentQty + amount > available) return;

    if (existing) {
      existing.qty += amount;
    } else {
      items.push({ productId, qty: amount });
    }

    writeCart(items);
    if (bannerOffer?.productIds.includes(productId)) {
      const claim = claimOffer(bannerOffer);
      if (claim) volatileStorage.setItem(HERO_BANNER_CLAIM_KEY, JSON.stringify(claim));
    }
    trackStorefrontEvent("add_to_cart", { productId });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  const disabled = !synced || !product || remaining <= 0;
  const label = !synced
    ? error
      ? "Stock unavailable"
      : "Checking stock…"
    : !product || available <= 0
      ? "Out of stock"
      : added
        ? "Added to cart"
        : remaining <= 0 ? "Stock limit reached" : "Add to cart";

  return (
    <>
    <div className={showQuantity ? "product-add-controls" : "contents"}>
    {showQuantity ? <div className="product-quantity" role="group" aria-label="Quantity to add">
      <button type="button" aria-label="Decrease quantity" disabled={disabled || selected <= 1}
        onClick={() => setQuantity(selected - 1)}>−</button>
      <output aria-live="polite" aria-label="Selected quantity">{remaining <= 0 && synced ? 0 : selected}</output>
      <button type="button" aria-label="Increase quantity" disabled={disabled || selected >= remaining}
        onClick={() => setQuantity(selected + 1)}>+</button>
    </div> : null}
    <button
      type="button"
      onClick={add}
      disabled={disabled}
      aria-label={ariaLabel}
      className={
        "w-full rounded-full font-semibold text-white transition " +
        (compact ? "px-4 py-3 text-xs " : "px-6 py-4 text-sm ") +
        (disabled
          ? "cursor-not-allowed bg-[#713a35]/30"
          : "bg-[#713a35] hover:-translate-y-0.5 hover:bg-[#60312d]")
      }
    >
      {label}
    </button>
    </div>
    <span className="sr-only" aria-live="polite">
      {added ? (product?.name || "Product") + " added to cart." : ""}
    </span>
    </>
  );
}
