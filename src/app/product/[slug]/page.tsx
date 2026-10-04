import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ArrowIcon } from "@/components/icons";
import { formatPrice, getProduct, products } from "@/lib/catalog";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return product ? { title: product.name, description: product.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <main className="shell py-8 md:py-12">
      <Link href="/shop" className="mb-7 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-black/50">
        <ArrowIcon className="h-3.5 w-3.5 rotate-180" /> Back to shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]" style={{ background: product.visual }}>
          <div className="absolute left-1/2 top-1/2 h-[54%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem_2rem_1.2rem_1.2rem] bg-white/75 shadow-[0_42px_75px_rgba(55,38,28,.16)]">
            <div className="mx-auto mt-[18%] h-[12%] w-[48%] rounded bg-black/72" />
            <div className="mt-[62%] text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/45">Aloyri</p>
              <p className="display mt-2 text-3xl">{product.category}</p>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start lg:py-8">
          <p className="text-xs uppercase tracking-[0.2em] text-black/45">{product.brand} · {product.category}</p>
          <h1 className="display mt-4 text-5xl leading-[.96] sm:text-6xl">{product.name}</h1>
          <div className="mt-6 flex items-center gap-3">
            <p className="text-lg">{formatPrice(product.price)}</p>
            {product.compareAtPrice ? <p className="text-sm text-black/35 line-through">{formatPrice(product.compareAtPrice)}</p> : null}
          </div>
          <p className="mt-2 text-sm text-black/45">{product.size}</p>
          <p className="mt-8 max-w-xl text-base leading-7 text-black/62">{product.description}</p>

          <div className="mt-8 border-y border-black/10 py-6">
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">Suitable for</p>
            <p className="mt-2 text-sm">{product.skinTypes.join(" · ")}</p>
          </div>

          <div className="mt-7">
            <AddToCart productId={product.id} />
            <p className="mt-4 text-center text-xs leading-5 text-black/45">Storefront cart only for now. CRM inventory and checkout integration have not been connected yet.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
