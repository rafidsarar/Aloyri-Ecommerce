"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ArrowIcon } from "@/components/icons";
import { ProductArtwork } from "@/components/product-artwork";
import { readCart, type CartItem, writeCart } from "@/lib/cart";
import { formatPrice, getProductById } from "@/lib/catalog";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const {
    products: liveProducts,
    synced,
    refreshing,
    error,
    refresh,
  } = useCatalog();

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
      items.map((item) => {
        const liveProduct = liveProducts.find(
          (product) => product.id === item.productId,
        );
        return {
          ...item,
          product: liveProduct ?? getProductById(item.productId),
          liveProduct,
        };
      }),
    [items, liveProducts],
  );

  const subtotal = rows.reduce(
    (sum, row) =>
      sum + (row.liveProduct ? row.liveProduct.price * row.qty : 0),
    0,
  );

  const hasUnavailable = rows.some(
    (row) =>
      !row.liveProduct ||
      (row.liveProduct.availableStock ?? 0) < row.qty,
  );
  const canCheckout =
    synced && !error && rows.length > 0 && !hasUnavailable;

  if (!hydrated || (items.length > 0 && !synced && !error)) {
    return (
      <main className="shell min-h-[55vh] py-12">
        <div className="h-40 animate-pulse rounded-[1.5rem] bg-[#f5e8e2]" />
      </main>
    );
  }

  if (items.length > 0 && !synced && error) {
    return (
      <main className="shell min-h-[60vh] py-16 text-center">
        <p className="display text-4xl">We can’t verify live stock right now.</p>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#321f1c]/50">
          Your cart is still saved, but checkout is paused until the CRM catalog
          can be refreshed safely.
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-7 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Try live stock again
        </button>
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

      {items.length === 0 ? (
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
            {rows.map(({ product, liveProduct, qty, productId }) => {
              const available = liveProduct?.availableStock ?? 0;
              const unavailable = !liveProduct || available <= 0;
              const overStock = Boolean(liveProduct) && qty > available;

              return (
                <div
                  key={productId}
                  className="grid grid-cols-[92px_1fr_auto] gap-4 border-b border-[#713a35]/10 py-5 first:pt-0 sm:grid-cols-[120px_1fr_auto] sm:gap-6"
                >
                  {product ? (
                    <Link href={`/product/${product.slug}`}>
                      <ProductArtwork
                        product={product}
                        className="aspect-[4/5] rounded-[1.2rem]"
                      />
                    </Link>
                  ) : (
                    <div className="aspect-[4/5] rounded-[1.2rem] bg-[#f5e8e2]" />
                  )}

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45">
                      {product?.brand || "Aloyri"}
                    </p>
                    <p className="mt-1 text-sm font-semibold sm:text-base">
                      {product?.name || "Unavailable product"}
                    </p>
                    <p className="mt-1 text-xs text-[#321f1c]/45">
                      {liveProduct
                        ? available > 0
                          ? `${available} available`
                          : "Out of stock"
                        : "No longer available"}
                    </p>

                    {overStock ? (
                      <p className="mt-2 text-xs font-medium text-red-700">
                        Your cart has {qty}, but only {available} is currently available.
                      </p>
                    ) : null}

                    {!unavailable ? (
                      <div className="mt-5 inline-flex items-center overflow-hidden rounded-full border border-[#713a35]/14 bg-white">
                        <button
                          type="button"
                          className="h-9 w-9 text-[#713a35]"
                          aria-label={`Decrease ${product?.name || "product"} quantity`}
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
                          disabled={qty >= available}
                          className="h-9 w-9 text-[#713a35] disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Increase ${product?.name || "product"} quantity`}
                          onClick={() =>
                            save(
                              items.map((item) =>
                                item.productId === productId
                                  ? {
                                      ...item,
                                      qty: Math.min(available, item.qty + 1),
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {liveProduct ? formatPrice(liveProduct.price * qty) : "—"}
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
              );
            })}
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-6 lg:sticky lg:top-32">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                Order summary
              </p>
              <span className="text-[10px] text-[#321f1c]/38">
                {refreshing ? "Refreshing…" : "Live CRM verified"}
              </span>
            </div>

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

            {hasUnavailable ? (
              <p className="mt-5 rounded-[.9rem] border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                Update or remove unavailable quantities before checkout.
              </p>
            ) : null}

            {canCheckout ? (
              <Link
                href="/checkout"
                className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#60312d]"
              >
                Continue to checkout <ArrowIcon />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-7 w-full cursor-not-allowed rounded-full bg-[#713a35]/30 px-6 py-4 text-sm font-semibold text-white"
              >
                Checkout unavailable
              </button>
            )}

            <p className="mt-4 text-center text-[11px] leading-5 text-[#321f1c]/42">
              Prices and available quantities are synchronized from Aloyri CRM.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
