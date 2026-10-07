"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ProductCard } from "@/components/product-card";
import { readCart, writeCart } from "@/lib/cart";
import { formatPrice, type Product } from "@/lib/catalog";
import { trackStorefrontEvent } from "@/lib/analytics";
import { salePriceFor } from "@/lib/promotions";
import { changeSignedInWishlist, syncSignedInWishlist } from "@/lib/customer-account-sync";
import {
  readSavedProductIds,
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  subscribeProductPreferences,
  readCompareProductIds,
  writeCompareProductIds,
} from "@/lib/product-preferences";

export function SavedProductsClient() {
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  async function change(productId?:string){
    setBusy(true);setNotice("");
    try{if(productId)await changeSignedInWishlist(productId,false);else await syncSignedInWishlist([]);}catch{setNotice("Unable to update wishlist. Please try again.");}finally{setBusy(false);}
  }
  const { products, synced, error, refresh } = useCatalog();
  useSyncExternalStore(
    subscribeProductPreferences,
    productPreferencesSnapshot,
    productPreferencesServerSnapshot,
  );
  const ids = readSavedProductIds();
  const compareIds = readCompareProductIds();

  const saved = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return ids
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [ids, products]);

  if (!synced) {
    return (
      <section className=" min-h-[60vh] py-16 text-center">
        <h2 className="display text-5xl">Wishlist.</h2>
        <p className="mt-4 text-sm text-[#321f1c]/50">
          {error
            ? "Live product information is temporarily unavailable."
            : "Checking live price and availability…"}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-6 rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className=" py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#713a35]/10 pb-9">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            Saved to your account
          </p>
          <h2 className="display mt-2 text-5xl sm:text-6xl">Wishlist.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#321f1c]/52">
            Keep a shortlist, move in-stock products straight to cart, or compare up to three. Live price and stock are always rechecked.
          </p>
        </div>
        {ids.length ? (
          <button
            type="button"
            onClick={() => void change()} disabled={busy}
            className="rounded-full border border-[#713a35]/16 px-4 py-2.5 text-xs font-semibold text-[#713a35]"
          >
            Clear saved
          </button>
        ) : null}
      </div>

      {notice?<p className="mt-4 text-sm text-red-700" role="alert">{notice}</p>:null}
      {saved.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {saved.map((product) => {
            const inStock = (product.availableStock ?? 0) > 0;
            const inCompare = compareIds.includes(product.id);
            return (
              <div key={product.id} className="rounded-[1.2rem] border border-transparent pb-4">
                <ProductCard product={product} />
                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                  <span className={inStock ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                    {inStock
                      ? formatPrice(salePriceFor(product)) + " · In stock"
                      : "Out of stock"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void change(product.id)} disabled={busy}
                    className="font-semibold text-[#713a35]"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!inStock}
                    onClick={() => {
                      const cart = readCart();
                      const existing = cart.find((item) => item.productId === product.id);
                      const max = product.availableStock ?? 0;
                      const next = existing
                        ? cart.map((item) =>
                            item.productId === product.id
                              ? { ...item, qty: Math.min(max, item.qty + 1) }
                              : item,
                          )
                        : [...cart, { productId: product.id, qty: 1 }];
                      writeCart(next);
                      trackStorefrontEvent("wishlist_move_to_cart", {
                        productId: product.id,
                        itemCount: next.reduce((sum, item) => sum + item.qty, 0),
                      });
                    }}
                    className="rounded-full bg-[#713a35] px-3 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    disabled={!inCompare && compareIds.length >= 3}
                    onClick={() =>
                      writeCompareProductIds(
                        inCompare
                          ? compareIds.filter((id) => id !== product.id)
                          : [...compareIds, product.id],
                      )
                    }
                    className="rounded-full border border-[#713a35]/15 px-3 py-2.5 font-semibold text-[#713a35] disabled:opacity-35"
                  >
                    {inCompare ? "Compared" : "Compare"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="display text-4xl">Your wishlist is empty.</p>
          <p className="mt-3 text-sm text-[#321f1c]/50">
            Add products from any product page to build your skincare shortlist.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-flex rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
          >
            Browse skincare
          </Link>
        </div>
      )}
    </section>
  );
}
