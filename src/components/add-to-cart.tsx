"use client";

import { useState } from "react";
import { readCart, writeCart } from "@/lib/cart";

export function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);

  function add() {
    const items = readCart();
    const existing = items.find((item) => item.productId === productId);

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ productId, qty: 1 });
    }

    writeCart(items);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={add}
      className="w-full rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#60312d]"
    >
      {added ? "Added to cart" : "Add to cart"}
    </button>
  );
}
