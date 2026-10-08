"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import { readCart, type CartItem, writeCart } from "@/lib/cart";
import { formatPrice, getProductById } from "@/lib/catalog";
import { hasSalePrice, salePriceFor } from "@/lib/promotions";
import { trackStorefrontEvent } from "@/lib/analytics";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const cartViewed = useRef(false);
  const {
    products: liveProducts,
    synced,
    refreshing,
    error,
    refresh,
  } = useCatalog();

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const existing = readCart();
      setItems(existing);
      setHydrated(true);

      const recoveryToken = new URL(window.location.href).searchParams.get("recovery");
      if (recoveryToken && /^[A-Za-z0-9_-]{40,160}$/.test(recoveryToken)) {
        void fetch(
          "/api/cart-recovery/restore?token=" + encodeURIComponent(recoveryToken),
          { cache: "no-store", credentials: "omit" },
        )
          .then(async (response) => {
            if (!response.ok) return null;
            return (await response.json()) as { items?: CartItem[] };
          })
          .then((result) => {
            if (!result?.items?.length) return;
            const merged = new Map(existing.map((item) => [item.productId, item.qty]));
            for (const item of result.items) {
              if (
                item &&
                typeof item.productId === "string" &&
                Number.isInteger(item.qty) &&
                item.qty > 0
              ) {
                merged.set(
                  item.productId,
                  Math.max(merged.get(item.productId) || 0, item.qty),
                );
              }
            }
            const restored = [...merged.entries()].map(([productId, qty]) => ({
              productId,
              qty,
            }));
            setItems(restored);
            writeCart(restored);
            trackStorefrontEvent("recovery_restore", {
              itemCount: restored.reduce((sum, item) => sum + item.qty, 0),
            });
            window.history.replaceState({}, "", "/cart");
          })
          .catch(() => undefined);
      }
    }, 0);

    return () => window.clearTimeout(initialize);
  }, []);

  function save(
    next: CartItem[],
    event?: {
      name: "cart_quantity_change" | "cart_remove";
      productId: string;
      quantityDelta?: number;
    },
  ) {
    setItems(next);
    writeCart(next);
    if (event) {
      trackStorefrontEvent(event.name, {
        productId: event.productId,
        itemCount: next.reduce((total, item) => total + item.qty, 0),
        ...(typeof event.quantityDelta === "number"
          ? { quantityDelta: event.quantityDelta }
          : {}),
      });
    }
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
      sum + (row.liveProduct ? salePriceFor(row.liveProduct) * row.qty : 0),
    0,
  );

  const hasUnavailable = rows.some(
    (row) =>
      !row.liveProduct ||
      (row.liveProduct.availableStock ?? 0) < row.qty,
  );
  const canCheckout =
    synced && !error && rows.length > 0 && !hasUnavailable;

  useEffect(() => {
    if (
      hydrated &&
      synced &&
      rows.length > 0 &&
      !cartViewed.current
    ) {
      cartViewed.current = true;
      trackStorefrontEvent("cart_view", {
        itemCount: rows.reduce((total, row) => total + row.qty, 0),
        totalBdt: subtotal,
      });
    }
  }, [hydrated, rows, subtotal, synced]);

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
    <main className="shell min-w-0 pb-32 pt-8 md:pb-16 lg:pb-16">
      <div className="border-b border-[#713a35]/10 pb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
          Your selection
        </p>
        <h1 className="display mt-3 text-5xl sm:text-7xl">Cart.</h1>
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
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-14">
          <div>
            {rows.map(({ product, liveProduct, qty, productId }) => {
              const available = liveProduct?.availableStock ?? 0;
              const unavailable = !liveProduct || available <= 0;
              const overStock = Boolean(liveProduct) && qty > available;
              const correctableStock = Boolean(liveProduct) && available > 0 && qty > available;

              return (
                <div
                  key={productId}
                  className="grid min-w-0 grid-cols-[76px_minmax(0,1fr)] gap-4 border-b border-[#713a35]/10 py-5 first:pt-0 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:gap-6 lg:grid-cols-[120px_minmax(0,1fr)_auto]"
                >
                  {product ? (
                    <Link href={`/product/${product.slug}`}>
                      <ProductMedia
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
                          className="h-11 w-11 text-[#713a35] disabled:opacity-30"
                          disabled={qty <= 1}
                          aria-label={`Decrease ${product?.name || "product"} quantity`}
                          onClick={() =>
                            save(
                              items.map((item) =>
                                item.productId === productId
                                  ? { ...item, qty: Math.max(1, item.qty - 1) }
                                  : item,
                              ),
                              {
                                name: "cart_quantity_change",
                                productId,
                                quantityDelta: qty > 1 ? -1 : 0,
                              },
                            )
                          }
                        >
                          −
                        </button>
                        <span className="w-9 text-center text-sm">{qty}</span>
                        <button
                          type="button"
                          disabled={qty >= available}
                          className="h-11 w-11 text-[#713a35] disabled:cursor-not-allowed disabled:opacity-30"
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
                              {
                                name: "cart_quantity_change",
                                productId,
                                quantityDelta: qty < available ? 1 : 0,
                              },
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {correctableStock ? (
                    <div className="col-span-2 sm:col-span-1">
                      <button type="button"
                        className="min-h-11 rounded-full border border-[#713a35]/20 px-4 text-xs font-semibold text-[#713a35]"
                        onClick={() => save(items.map(item => item.productId === productId ? { ...item, qty: available } : item), {
                          name: "cart_quantity_change", productId, quantityDelta: available - qty,
                        })}
                      >
                        Update to {available} available
                      </button>
                    </div>
                  ) : null}
                  <div className="col-span-2 flex min-w-0 items-center justify-between gap-4 pl-[92px] sm:col-span-1 sm:block sm:pl-0 sm:text-right">
                    <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {liveProduct ? formatPrice(salePriceFor(liveProduct) * qty) : "—"}
                    </p>
                    {liveProduct && hasSalePrice(liveProduct) ? (
                      <>
                        <p className="mt-1 text-[11px] text-[#321f1c]/38 line-through">
                          {formatPrice(liveProduct.price * qty)}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#713a35]">
                          {liveProduct.promotionBadge || "Promotion"}
                        </p>
                      </>
                    ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${product?.name || "product"} from cart`}
                      onClick={() =>
                        save(
                          items.filter((item) => item.productId !== productId),
                          {
                            name: "cart_remove",
                            productId,
                            quantityDelta: -qty,
                          },
                        )
                      }
                      className="min-h-11 shrink-0 text-xs font-semibold text-[#713a35] underline decoration-[#713a35]/25 underline-offset-4 sm:mt-6"
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

            <p className="mt-5 text-xs leading-5 text-[#321f1c]/65">You can shop without signing in. A free Aloyri account is required before placing your order.</p>
            {canCheckout ? (
              <Link
                href="/checkout"
                className="mt-7 hidden min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#60312d] lg:inline-flex"
              >
                Continue to checkout <ArrowIcon />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-7 hidden w-full cursor-not-allowed rounded-full bg-[#713a35]/30 px-6 py-4 text-sm font-semibold text-white lg:block"
              >
                Checkout unavailable
              </button>
            )}

            <p className="mt-4 text-center text-[11px] leading-5 text-[#321f1c]/42">
              Your cart is temporary for this visit. Saved products are kept in your signed-in account.
            </p>
          </aside>
          <div className="checkout-mobile-bar fixed inset-x-0 bottom-0 z-30 border-t border-[#713a35]/10 bg-[#fffaf7]/96 p-3 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-[#321f1c]/60">Subtotal · shipping next</p>
                <p className="font-semibold">{formatPrice(subtotal)}</p>
              </div>
              {canCheckout ? (
                <Link href="/checkout" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#713a35] px-5 text-sm font-semibold text-white">
                  Checkout <ArrowIcon />
                </Link>
              ) : (
                <button type="button" disabled className="min-h-12 rounded-full bg-[#713a35]/30 px-5 text-sm font-semibold text-white">
                  Checkout unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
