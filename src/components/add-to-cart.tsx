"use client";

import { useState } from "react";

const CART_KEY = "aloyri_cart";

type StoredItem = { productId: string; qty: number };

export function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);

  function add() {
    let items: StoredItem[] = [];
    try {
      items = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as StoredItem[];
    } catch {
      items = [];
    }

    const existing = items.find((item) => item.productId === productId);
    if (existing) existing.qty += 1;
    else items.push({ productId, qty: 1 });

    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("aloyri-cart-updated"));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button onClick={add} className="primary-button w-full sm:w-auto">
      {added ? "Added to bag" : "Add to bag"}
    </button>
  );
}
