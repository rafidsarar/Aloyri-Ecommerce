import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { formatPrice, getProduct, products } from "@/lib/catalog";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product" };
  return { title: product.name, description: product.description };
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = products.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <main>
      <section className="shell grid gap-8 pt-8 md:grid-cols-2 md:gap-12 md:pt-12">
        <div className="product-visual aspect-[4/5]" style={{ background: product.visual }}>
          <div className="product-bottle product-bottle-large" aria-hidden="true">
            <span>ALOYRI</span>
            <small>{product.category}</small>
          </div>
        </div>

        <div className="flex flex-col justify-center md:py-10">
          <Link href="/shop" className="eyebrow">Shop / {product.category}</Link>
          <h1 className="mt-5 text-4xl font-medium tracking-[-0.035em] sm:text-5xl">{product.name}</h1>
          <p className="mt-3 text-sm text-black/45">{product.size}</p>
          <div className="mt-6 flex items-center gap-3 text-lg">
            <span>{formatPrice(product.price)}</span>
            {product.compareAtPrice && <span className="text-sm text-black/35 line-through">{formatPrice(product.compareAtPrice)}</span>}
          </div>
          <p className="mt-8 max-w-lg text-[15px] leading-7 text-black/60">{product.description}</p>

          <div className="mt-8 border-y border-black/10 py-5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/40">Best suited for</p>
            <p className="mt-2 text-sm">{product.skinTypes.join(" · ")}</p>
          </div>

          <div className="mt-8"><AddToCart productId={product.id} /></div>
          <p className="mt-4 text-xs leading-5 text-black/40">Stock and fulfillment are intentionally not connected to CRM yet.</p>
        </div>
      </section>

      <section className="shell mt-20">
        <div className="flex items-end justify-between">
          <div><p className="eyebrow">Continue your routine</p><h2 className="section-title mt-3">You may also like</h2></div>
          <Link href="/shop" className="text-sm underline underline-offset-4">Shop all</Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {related.map((item) => <ProductCard key={item.id} product={item} />)}
        </div>
      </section>
    </main>
  );
}
