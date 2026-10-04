"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, products } from "@/lib/catalog";

const CART_KEY = "aloyri_cart";
type CartItem = { productId: string; qty: number };

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[]);
    } catch {
      setItems([]);
    }
  }, []);

  function save(next: CartItem[]) {
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("aloyri-cart-updated"));
  }

  const rows = useMemo(() => items.map((item) => ({
    ...item,
    product: products.find((product) => product.id === item.productId),
  })).filter((item) => item.product), [items]);

  const subtotal = rows.reduce((sum, row) => sum + (row.product?.price ?? 0) * row.qty, 0);

  return (
    <main className="shell py-12 md:py-18">
      <div className="border-b border-black/10 pb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-black/45">Your selection</p>
        <h1 className="display mt-3 text-6xl sm:text-7xl">Cart.</h1>
      </div>

      {rows.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-4xl">Your cart is quiet.</p>
          <p className="mt-3 text-sm text-black/50">Explore the Aloyri edit and add something that fits your routine.</p>
          <Link href="/shop" className="mt-7 inline-block rounded-full bg-[#211d1a] px-6 py-3.5 text-sm text-white">Shop products</Link>
        </div>
      ) : (
        <div className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
          <div>
            {rows.map(({ product, qty, productId }) => product ? (
              <div key={productId} className="grid grid-cols-[110px_1fr_auto] gap-5 border-b border-black/10 py-5 first:pt-0">
                <div className="aspect-[4/5] rounded-2xl" style={{ background: product.visual }} />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/42">{product.brand}</p>
                  <Link href={`/product/${product.slug}`} className="mt-1 block font-medium">{product.name}</Link>
                  <p className="mt-1 text-xs text-black/45">{product.size}</p>
                  <div className="mt-5 inline-flex items-center overflow-hidden rounded-full border border-black/10">
                    <button className="h-9 w-9" onClick={() => save(items.map((item) => item.productId === productId ? { ...item, qty: Math.max(1, item.qty - 1) } : item))}>−</button>
                    <span className="w-8 text-center text-sm">{qty}</span>
                    <button className="h-9 w-9" onClick={() => save(items.map((item) => item.productId === productId ? { ...item, qty: item.qty + 1 } : item))}>+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatPrice(product.price * qty)}</p>
                  <button onClick={() => save(items.filter((item) => item.productId !== productId))} className="mt-6 text-xs text-black/40 underline underline-offset-4">Remove</button>
                </div>
              </div>
            ) : null)}
          </div>

          <aside className="h-fit rounded-[1.5rem] bg-[#ece4dc] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">Order summary</p>
            <div className="mt-6 flex justify-between border-b border-black/10 pb-5 text-sm">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-5 text-xs leading-5 text-black/50">Delivery pricing and checkout will be connected in the next commerce cycle. No CRM or payment action occurs from this cart yet.</p>
            <button disabled className="mt-6 w-full cursor-not-allowed rounded-full bg-black/20 px-6 py-4 text-sm text-black/45">Checkout — next cycle</button>
          </aside>
        </div>
      )}
    </main>
  );
}
