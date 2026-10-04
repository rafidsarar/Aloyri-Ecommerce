"use client";

import { useState } from "react";

const CART_KEY = "aloyri_cart";

type CartItem = { productId: string; qty: number };

export function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);

  function add() {
    let items: CartItem[] = [];
    try {
      items = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
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
    <button onClick={add} className="w-full rounded-full bg-[#211d1a] px-6 py-4 text-sm font-medium text-white transition hover:-translate-y-0.5">
      {added ? "Added to cart" : "Add to cart"}
    </button>
  );
}
