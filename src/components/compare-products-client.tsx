"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { useCatalog } from "@/components/catalog-provider";
import { ProductMedia } from "@/components/product-media";
import {
  formatPrice,
  productStockLabel,
  type Product,
} from "@/lib/catalog";
import { salePriceFor } from "@/lib/promotions";
import {
  PRODUCT_PREFERENCES_EVENT,
  readCompareProductIds,
  writeCompareProductIds,
} from "@/lib/product-preferences";

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-[#713a35]/10 px-4 py-4 text-sm">{children}</div>;
}

export function CompareProductsClient() {
  const { products, synced, error, refresh } = useCatalog();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const load = () => setIds(readCompareProductIds());
    load();
    window.addEventListener(PRODUCT_PREFERENCES_EVENT, load);
    return () => window.removeEventListener(PRODUCT_PREFERENCES_EVENT, load);
  }, []);

  const compared = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return ids
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [ids, products]);

  if (!synced) {
    return (
      <main className="shell min-h-[60vh] py-16 text-center">
        <h1 className="display text-5xl">Compare products.</h1>
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
      </main>
    );
  }

  return (
    <main className="shell py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#713a35]/10 pb-9">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            Side-by-side
          </p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">Compare products.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#321f1c]/52">
            Compare up to three products using live price and availability plus website-owned routine details.
          </p>
        </div>
        {ids.length ? (
          <button
            type="button"
            onClick={() => writeCompareProductIds([])}
            className="rounded-full border border-[#713a35]/16 px-4 py-2.5 text-xs font-semibold text-[#713a35]"
          >
            Clear comparison
          </button>
        ) : null}
      </div>

      {compared.length ? (
        <div className="mt-10 overflow-x-auto rounded-[1.6rem] border border-[#713a35]/10 bg-white/60">
          <div
            className="grid min-w-[760px]"
            style={{ gridTemplateColumns: "170px repeat(" + compared.length + ", minmax(190px, 1fr))" }}
          >
            <div className="p-4" />
            {compared.map((product) => (
              <div key={product.id} className="p-4">
                <ProductMedia
                  product={product}
                  className="aspect-[4/5] rounded-[1.2rem]"
                />
                <Link
                  href={"/product/" + product.slug}
                  className="mt-4 block font-semibold"
                >
                  {product.name}
                </Link>
                <p className="mt-1 text-xs text-[#321f1c]/45">{product.brand}</p>
                <button
                  type="button"
                  onClick={() =>
                    writeCompareProductIds(ids.filter((id) => id !== product.id))
                  }
                  className="mt-3 text-xs font-semibold text-[#713a35]"
                >
                  Remove
                </button>
              </div>
            ))}

            <Cell>Live price</Cell>
            {compared.map((product) => (
              <Cell key={"price-" + product.id}>
                <strong>{formatPrice(salePriceFor(product))}</strong>
              </Cell>
            ))}

            <Cell>Availability</Cell>
            {compared.map((product) => (
              <Cell key={"stock-" + product.id}>{productStockLabel(product)}</Cell>
            ))}

            <Cell>Category</Cell>
            {compared.map((product) => (
              <Cell key={"category-" + product.id}>{product.category}</Cell>
            ))}

            <Cell>Size</Cell>
            {compared.map((product) => (
              <Cell key={"size-" + product.id}>{product.size}</Cell>
            ))}

            <Cell>Routine step</Cell>
            {compared.map((product) => (
              <Cell key={"routine-" + product.id}>{product.routineStep}</Cell>
            ))}

            <Cell>Texture</Cell>
            {compared.map((product) => (
              <Cell key={"texture-" + product.id}>{product.texture}</Cell>
            ))}

            <Cell>Best for</Cell>
            {compared.map((product) => (
              <Cell key={"best-" + product.id}>{product.bestFor}</Cell>
            ))}

            <Cell>Add to cart</Cell>
            {compared.map((product) => (
              <div key={"cart-" + product.id} className="border-t border-[#713a35]/10 p-4">
                <AddToCart productId={product.id} compact />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="display text-4xl">No products selected.</p>
          <p className="mt-3 text-sm text-[#321f1c]/50">
            Use “Compare product” on a product page to add up to three items.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-flex rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
          >
            Browse skincare
          </Link>
        </div>
      )}
    </main>
  );
}
