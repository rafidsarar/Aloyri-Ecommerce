"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, products } from "@/lib/catalog";

const CART_KEY = "aloyri_cart";

type StoredItem = { productId: string; qty: number };

export default function CartPage() {
  const [items, setItems] = useState<StoredItem[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as StoredItem[]);
    } catch {
      setItems([]);
    }
  }, []);

  function persist(next: StoredItem[]) {
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("aloyri-cart-updated"));
  }

  function adjust(productId: string, change: number) {
    const next = items
      .map((item) => item.productId === productId ? { ...item, qty: item.qty + change } : item)
      .filter((item) => item.qty > 0);
    persist(next);
  }

  const detailed = useMemo(() => items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ ...item, product }] : [];
  }), [items]);

  const subtotal = detailed.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  return (
    <main className="shell pt-12 md:pt-16">
      <p className="eyebrow">Your bag</p>
      <h1 className="display-title mt-4">A considered routine.</h1>

      {detailed.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-black/10 bg-white/45 px-6 py-16 text-center">
          <p className="text-2xl font-medium tracking-[-0.02em]">Your bag is empty.</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/50">Explore the Aloyri edit and add the products that fit your routine.</p>
          <Link href="/shop" className="primary-button mt-7 inline-flex">Explore shop</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="divide-y divide-black/10 border-y border-black/10">
            {detailed.map(({ product, qty }) => (
              <div key={product.id} className="grid grid-cols-[96px_1fr] gap-5 py-6 sm:grid-cols-[120px_1fr]">
                <div className="product-visual aspect-[4/5]" style={{ background: product.visual }}>
                  <div className="product-bottle product-bottle-mini" aria-hidden="true"><span>ALOYRI</span></div>
                </div>
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-black/40">{product.category}</p>
                    <Link href={`/product/${product.slug}`} className="mt-1 block text-base font-medium">{product.name}</Link>
                    <p className="mt-1 text-xs text-black/45">{product.size}</p>
                    <div className="mt-4 inline-flex items-center rounded-full border border-black/10 bg-white/60">
                      <button className="px-3 py-1.5" onClick={() => adjust(product.id, -1)} aria-label="Decrease quantity">−</button>
                      <span className="min-w-8 text-center text-sm">{qty}</span>
                      <button className="px-3 py-1.5" onClick={() => adjust(product.id, 1)} aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                  <p className="text-sm">{formatPrice(product.price * qty)}</p>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-[1.5rem] bg-[#eee5da] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Order summary</p>
            <div className="mt-6 flex justify-between border-b border-black/10 pb-4 text-sm"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="mt-4 flex justify-between text-sm text-black/50"><span>Delivery</span><span>Calculated later</span></div>
            <button disabled className="primary-button mt-7 w-full opacity-45">Checkout coming next</button>
            <p className="mt-4 text-xs leading-5 text-black/45">Checkout stays disabled until we implement the next commerce phase safely.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
