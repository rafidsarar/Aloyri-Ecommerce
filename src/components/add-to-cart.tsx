"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCatalogProduct } from "@/components/catalog-provider";
import { readCart, writeCart } from "@/lib/cart";
import { trackStorefrontEvent } from "@/lib/analytics";

export function AddToCart({
  productId,
  compact = false,
  ariaLabel,
  checkoutOnAdd = false,
  showCartLink = false,
}: {
  productId: string;
  compact?: boolean;
  ariaLabel?: string;
  checkoutOnAdd?: boolean;
  showCartLink?: boolean;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const { product, synced, error } = useCatalogProduct(productId);
  const available = product?.availableStock ?? 0;

  function add() {
    if (!synced || !product || available <= 0) return;

    const items = readCart();
    const existing = items.find((item) => item.productId === productId);
    const currentQty = existing?.qty ?? 0;

    if (currentQty >= available) {
      if (checkoutOnAdd && currentQty > 0) {
        router.push("/checkout");
      } else {
        setAtLimit(true);
      }
      return;
    }

    if (existing) existing.qty += 1;
    else items.push({ productId, qty: 1 });
    writeCart(items);
    trackStorefrontEvent("add_to_cart", { productId });
    setAtLimit(false);
    setAdded(true);
    if (checkoutOnAdd) router.push("/checkout");
  }

  const disabled = !synced || !product || available <= 0;
  const label = !synced
    ? error
      ? "Stock unavailable"
      : "Checking stock…"
    : !product || available <= 0
      ? "Out of stock"
      : checkoutOnAdd
        ? "Buy now"
        : atLimit
          ? "Max in cart"
          : added
            ? "Added to cart"
            : "Add to cart";

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        aria-label={ariaLabel}
        className={
          "min-h-11 w-full rounded-full font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 " +
          (compact ? "px-3 py-3 text-xs " : "px-5 py-4 text-sm ") +
          (disabled
            ? "cursor-not-allowed bg-[#713a35]/30"
            : checkoutOnAdd
              ? "bg-[#321f1c] hover:bg-[#4a322d]"
              : "bg-[#713a35] hover:bg-[#60312d]")
        }
      >
        {label}
      </button>
      {atLimit && !checkoutOnAdd ? (
        <p role="status" className="mt-2 text-center text-xs text-[#713a35]">
          Your cart already has the available quantity. <Link href="/cart" className="font-semibold underline">View cart</Link>
        </p>
      ) : added && showCartLink && !checkoutOnAdd ? (
        <Link href="/cart" className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-xs font-semibold text-[#713a35] underline underline-offset-4">
          View cart and checkout →
        </Link>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {added ? (product?.name || "Product") + " added to cart." : ""}
      </span>
    </div>
  );
}
