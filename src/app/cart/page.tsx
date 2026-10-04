"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductArtwork } from "@/components/product-artwork";
import { readCart, type CartItem, writeCart } from "@/lib/cart";
import { formatPrice, products } from "@/lib/catalog";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
  }, []);

  function save(next: CartItem[]) {
    setItems(next);
    writeCart(next);
  }

  const rows = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          product: products.find((product) => product.id === item.productId),
        }))
        .filter((item) => item.product),
    [items],
  );

  const subtotal = rows.reduce(
    (sum, row) => sum + (row.product?.price ?? 0) * row.qty,
    0,
  );

  if (!hydrated) {
    return (
      <main className="shell min-h-[55vh] py-12">
        <div className="h-40 animate-pulse rounded-[1.5rem] bg-[#f5e8e2]" />
      </main>
    );
  }

  return (
    <main className="shell py-12 md:py-16">
      <div className="border-b border-[#713a35]/10 pb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
          Your selection
        </p>
        <h1 className="display mt-3 text-6xl sm:text-7xl">Cart.</h1>
      </div>

      {rows.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-4xl">Your cart is empty.</p>
          <p className="mt-3 text-sm text-[#321f1c]/50">
            Start with cleansers, moisturizers or daily SPF.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-flex rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
          >
            Shop skincare
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 py-10 lg:grid-cols-[1fr_370px] lg:gap-14">
          <div>
            {rows.map(({ product, qty, productId }) =>
              product ? (
                <div
                  key={productId}
                  className="grid grid-cols-[92px_1fr_auto] gap-4 border-b border-[#713a35]/10 py-5 first:pt-0 sm:grid-cols-[120px_1fr_auto] sm:gap-6"
                >
                  <Link href={`/product/${product.slug}`}>
                    <ProductArtwork
                      product={product}
                      className="aspect-[4/5] rounded-[1.2rem]"
                    />
                  </Link>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45">
                      {product.brand}
                    </p>
                    <Link
                      href={`/product/${product.slug}`}
                      className="mt-1 block text-sm font-semibold sm:text-base"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-xs text-[#321f1c]/45">{product.size}</p>

                    <div className="mt-5 inline-flex items-center overflow-hidden rounded-full border border-[#713a35]/14 bg-white">
                      <button
                        type="button"
                        className="h-9 w-9 text-[#713a35]"
                        aria-label={`Decrease ${product.name} quantity`}
                        onClick={() =>
                          save(
                            items.map((item) =>
                              item.productId === productId
                                ? { ...item, qty: Math.max(1, item.qty - 1) }
                                : item,
                            ),
                          )
                        }
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{qty}</span>
                      <button
                        type="button"
                        className="h-9 w-9 text-[#713a35]"
                        aria-label={`Increase ${product.name} quantity`}
                        onClick={() =>
                          save(
                            items.map((item) =>
                              item.productId === productId
                                ? { ...item, qty: item.qty + 1 }
                                : item,
                            ),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatPrice(product.price * qty)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        save(items.filter((item) => item.productId !== productId))
                      }
                      className="mt-6 text-xs text-[#713a35]/48 underline decoration-[#713a35]/25 underline-offset-4"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : null,
            )}
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-6 lg:sticky lg:top-32">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
              Order summary
            </p>

            <div className="mt-6 flex justify-between border-b border-[#713a35]/10 pb-5 text-sm">
              <span className="text-[#321f1c]/58">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex justify-between border-b border-[#713a35]/10 py-5 text-sm">
              <span className="text-[#321f1c]/58">Delivery</span>
              <span className="text-right text-xs text-[#321f1c]/45">
                Set during checkout
              </span>
            </div>

            <div className="flex justify-between pt-5">
              <span className="text-sm font-semibold">Estimated total</span>
              <span className="text-lg font-semibold">{formatPrice(subtotal)}</span>
            </div>

            <button
              type="button"
              disabled
              className="mt-7 w-full cursor-not-allowed rounded-full bg-[#713a35]/28 px-6 py-4 text-sm font-semibold text-white"
            >
              Checkout opening soon
            </button>

            <p className="mt-4 text-center text-[11px] leading-5 text-[#321f1c]/42">
              Cart is ready. Checkout will be enabled when live inventory and
              order creation are connected.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
