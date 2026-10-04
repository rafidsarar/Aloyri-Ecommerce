"use client";

import Link from "next/link";
import { AddToCart } from "@/components/add-to-cart";
import { useCatalog } from "@/components/catalog-provider";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import { ProductCard } from "@/components/product-card";
import {
  formatPrice,
  productStockLabel,
  type Product,
} from "@/lib/catalog";
import { getVerifiedProductContent } from "@/lib/product-verification";

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

  const verified = getVerifiedProductContent(product.id);
  const directions = verified?.directions ?? product.howToUse;
  const careNotes = verified?.warnings ?? product.careNotes;

  const related = products
    .filter(
      (candidate) =>
        candidate.id !== product.id && candidate.category === product.category,
    )
    .slice(0, 3);

  return (
    <main className="shell py-8 md:py-12">
      <nav
        aria-label="Breadcrumb"
        className="mb-7 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45"
      >
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <span className="text-[#321f1c]/48">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
        <div>
          <ProductMedia
            product={product}
            priority
            className="aspect-[4/5] rounded-[2rem] soft-shadow"
          />
          {verified?.photo ? (
            <p className="mt-3 text-[11px] leading-5 text-[#321f1c]/42">
              Product photography:{" "}
              <a
                href={verified.photo.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#713a35] underline decoration-[#713a35]/20 underline-offset-4"
              >
                {verified.photo.sourceLabel}
              </a>
              {verified.photo.exactVariant ? " · exact listed variant" : ""}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-[1.1rem] bg-[#f5e8e2] p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/46">
                Texture
              </p>
              <p className="mt-2 text-xs leading-5 text-[#321f1c]/66">
                {product.texture}
              </p>
            </div>
            <div className="rounded-[1.1rem] bg-[#f5e8e2] p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/46">
                Routine
              </p>
              <p className="mt-2 text-xs leading-5 text-[#321f1c]/66">
                {product.routineStep}
              </p>
            </div>
            <div className="rounded-[1.1rem] bg-[#f5e8e2] p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/46">
                Size
              </p>
              <p className="mt-2 text-xs leading-5 text-[#321f1c]/66">
                {product.size}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start lg:py-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#f5e8e2] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#713a35]">
              {product.category}
            </span>
            <span
              className={`rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                (product.availableStock ?? 0) > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-black/8 text-black/50"
              }`}
            >
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
            <p className="max-w-[210px] text-right text-xs leading-5 text-[#321f1c]/45">
              {product.bestFor}
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-[#321f1c]/38">
              <span>Live price</span>
              <span>Live availability</span>
              <span>COD checkout</span>
            </div>
          </div>
        </div>
      </div>

      {verified ? (
        <section className="mt-16 rounded-[1.6rem] border border-[#713a35]/10 bg-[#f7ebe6] p-6 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
                Manufacturer-verified
              </p>
              <h2 className="display mt-2 text-3xl">
                Product facts from {verified.sourceLabel}.
              </h2>
              <a
                href={verified.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#713a35] underline decoration-[#713a35]/20 underline-offset-4"
              >
                View verification source <ArrowIcon className="h-3.5 w-3.5" />
              </a>
              <p className="mt-3 text-[11px] text-[#321f1c]/40">
                Verified {verified.verifiedAt}
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {verified.claims.map((claim) => (
                <li
                  key={claim}
                  className="flex gap-3 rounded-[1rem] bg-white/65 p-4 text-sm leading-6 text-[#321f1c]/62"
                >
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9725f]" />
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
          </div>
          {verified.sourceNote ? (
            <p className="mt-6 border-t border-[#713a35]/10 pt-5 text-xs leading-6 text-[#321f1c]/48">
              {verified.sourceNote}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={`mt-5 grid gap-5 ${careNotes.length > 0 ? "lg:grid-cols-2" : ""}`}>
        <div className="rounded-[1.6rem] border border-[#713a35]/10 bg-white/65 p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            How to use
          </p>
          <ol className="mt-5 grid gap-5">
            {directions.map((step, index) => (
              <li key={step} className="grid grid-cols-[32px_1fr] gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5e8e2] text-xs font-semibold text-[#713a35]">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-7 text-[#321f1c]/60">{step}</p>
              </li>
            ))}
          </ol>
          {verified ? (
            <p className="mt-5 text-[11px] leading-5 text-[#321f1c]/38">
              Directions summarised from {verified.sourceLabel}. Follow the exact pack directions if they differ.
            </p>
          ) : null}
        </div>

        {careNotes.length > 0 ? (
          <div className="rounded-[1.6rem] border border-[#713a35]/10 bg-[#f5e8e2] p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
              {verified?.warnings?.length ? "Warnings & care" : "Good to know"}
            </p>
            <ul className="mt-5 grid gap-4">
              {careNotes.map((note) => (
                <li key={note} className="flex gap-3 text-sm leading-7 text-[#321f1c]/60">
                  <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9725f]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-5 rounded-[1.6rem] border border-[#713a35]/10 bg-white/65 p-6 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
              Ingredients
            </p>
            <h2 className="display mt-2 text-3xl">
              {verified ? "Verified formulation details." : "Verified information first."}
            </h2>
          </div>

          <div>
            {verified?.keyIngredients?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#713a35]/55">
                  {verified.ingredients?.length ? "Highlighted ingredients" : "Manufacturer-highlighted ingredients"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {verified.keyIngredients.map((ingredient) => (
                    <span
                      key={ingredient}
                      className="rounded-full bg-[#f5e8e2] px-3 py-2 text-xs text-[#321f1c]/65"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {verified?.ingredients?.length ? (
              <details className="mt-5 rounded-[1rem] border border-[#713a35]/10 bg-[#fffaf7] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#713a35]">
                  View full verified ingredient list
                </summary>
                <p className="mt-4 text-xs leading-6 text-[#321f1c]/55">
                  {verified.ingredients.join(", ")}.
                </p>
              </details>
            ) : (
              <p className="text-sm leading-7 text-[#321f1c]/58">
                {product.ingredientNote}
              </p>
            )}

            {verified?.ingredientSourceLabel ? (
              <p className="mt-4 text-[11px] leading-5 text-[#321f1c]/40">
                Ingredient source:{" "}
                <a
                  href={verified.ingredientSourceUrl || verified.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#713a35] underline decoration-[#713a35]/20 underline-offset-4"
                >
                  {verified.ingredientSourceLabel}
                </a>
              </p>
            ) : verified ? (
              <p className="mt-4 text-[11px] leading-5 text-[#321f1c]/40">
                Ingredient source: {verified.sourceLabel}. Always compare with the ingredient list printed on the exact product you receive.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <Link
          href="/shipping-delivery"
          className="rounded-[1.3rem] border border-[#713a35]/10 bg-white/60 p-5 transition hover:bg-white"
        >
          <p className="text-sm font-semibold">Shipping & delivery</p>
          <p className="mt-2 text-xs leading-6 text-[#321f1c]/48">
            ৳80 inside Dhaka · ৳150 outside Dhaka.
          </p>
        </Link>
        <Link
          href="/returns-refunds"
          className="rounded-[1.3rem] border border-[#713a35]/10 bg-white/60 p-5 transition hover:bg-white"
        >
          <p className="text-sm font-semibold">Returns & refunds</p>
          <p className="mt-2 text-xs leading-6 text-[#321f1c]/48">
            Return requests are reviewed before refund or restocking decisions.
          </p>
        </Link>
        <Link
          href="/track-order"
          className="rounded-[1.3rem] border border-[#713a35]/10 bg-white/60 p-5 transition hover:bg-white"
        >
          <p className="text-sm font-semibold">Track your order</p>
          <p className="mt-2 text-xs leading-6 text-[#321f1c]/48">
            Use your website order number and checkout mobile number.
          </p>
        </Link>
      </section>

      {related.length > 0 ? (
        <section className="mt-20 border-t border-[#713a35]/10 pt-12 md:mt-24">
          <div className="mb-8 flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
                Keep exploring
              </p>
              <h2 className="display mt-2 text-4xl">More {product.category.toLowerCase()}.</h2>
            </div>
            <Link href="/shop" className="text-sm font-semibold text-[#713a35]">
              Shop all
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((candidate) => (
              <ProductCard key={candidate.id} product={candidate} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
