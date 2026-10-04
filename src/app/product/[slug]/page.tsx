import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ArrowIcon } from "@/components/icons";
import { ProductArtwork } from "@/components/product-artwork";
import { formatPrice, getProduct, products } from "@/lib/catalog";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  return product
    ? {
        title: `${product.brand} ${product.name}`,
        description: product.description,
      }
    : {};
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();

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
            {product.bestseller ? (
              <span className="rounded-full border border-[#713a35]/12 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/60">
                Bestseller
              </span>
            ) : null}
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
              <span>BDT pricing</span>
              <span>Secure checkout next</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
