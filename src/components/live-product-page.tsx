"use client";

import Link from "next/link";
import { AddToCart } from "@/components/add-to-cart";
import { useCatalog } from "@/components/catalog-provider";
import { ArrowIcon } from "@/components/icons";
import { ProductArtwork } from "@/components/product-artwork";
import {
  formatPrice,
  productStockLabel,
  type Product,
} from "@/lib/catalog";

export function LiveProductPage({
  slug,
  fallback,
}: {
  slug: string;
  fallback: Product | null;
}) {
  const { products, synced, error, refresh } = useCatalog();
  const product = products.find(
    (candidate) =>
      candidate.slug === slug ||
      candidate.id === slug ||
      (fallback && candidate.id === fallback.id),
  );

  if (!synced) {
    return (
      <main className="shell min-h-[65vh] py-10 md:py-14">
        {error ? (
          <div className="rounded-[1.5rem] border border-[#713a35]/10 bg-[#fff4ef] p-8 text-center">
            <p className="display text-3xl">Live product information is unavailable.</p>
            <p className="mt-3 text-sm text-[#321f1c]/50">
              Aloyri will not show a potentially stale price or stock level.
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-6 rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-[#f5e8e2]" />
            <div className="h-72 animate-pulse rounded-[2rem] bg-[#f5e8e2]" />
          </div>
        )}
      </main>
    );
  }

  if (!product) {
    return (
      <main className="shell min-h-[60vh] py-20 text-center">
        <p className="display text-4xl">This product is not currently available.</p>
        <Link
          href="/shop"
          className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Back to shop <ArrowIcon />
        </Link>
      </main>
    );
  }

  return (
    <main className="shell py-8 md:py-12">
      <Link
        href="/shop"
        className="mb-7 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/50"
      >
        <ArrowIcon className="h-3.5 w-3.5 rotate-180" />
        Back to shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
        <ProductArtwork
          product={product}
          className="aspect-[4/5] rounded-[2rem] soft-shadow"
        />

        <div className="lg:sticky lg:top-32 lg:self-start lg:py-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#f5e8e2] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#713a35]">
              {product.category}
            </span>
            <span className={`rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
              (product.availableStock ?? 0) > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-black/8 text-black/50"
            }`}>
              {productStockLabel(product)}
            </span>
          </div>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            {product.brand}
          </p>
          <h1 className="display mt-3 text-5xl leading-[0.94] sm:text-6xl">
            {product.name}
          </h1>

          <div className="mt-6 flex items-end justify-between gap-5 border-b border-[#713a35]/10 pb-7">
            <div>
              <p className="text-xl font-semibold">{formatPrice(product.price)}</p>
              <p className="mt-1 text-xs text-[#321f1c]/45">
                {product.size}
                {product.origin ? ` · ${product.origin}` : ""}
              </p>
            </div>
            <p className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/45">
              {product.routineStep}
            </p>
          </div>

          <p className="mt-7 max-w-xl text-base leading-7 text-[#321f1c]/60">
            {product.description}
          </p>

          <div className="mt-7 rounded-[1.3rem] bg-[#f7ebe6] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
              Routine note
            </p>
            <p className="mt-2 text-sm leading-6 text-[#321f1c]/62">
              {product.skinNote}
            </p>
          </div>

          <div className="mt-7">
            <AddToCart productId={product.id} />
            <div className="mt-4 flex items-center justify-center gap-5 text-[10px] uppercase tracking-[0.14em] text-[#321f1c]/38">
              <span>Live CRM price</span>
              <span>Live available stock</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
