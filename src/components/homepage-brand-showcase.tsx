import Link from "next/link";
import { ProductMedia } from "@/components/product-media";
import type { Product } from "@/lib/catalog";

export function HomepageBrandShowcase({ products }: { products: Product[] }) {
  const brands = new Map<string, { name: string; count: number; image: Product }>();
  for (const product of products) {
    if (!product.brand.trim() || (product.availableStock ?? 0) <= 0 || product.merchandisingOutOfStockMode === "hide") continue;
    const id = product.brand.trim().toLocaleLowerCase("en");
    const row = brands.get(id);
    if (row) row.count += 1;
    else brands.set(id, { name: product.brand.trim(), count: 1, image: product });
  }
  const featured = [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 6);
  if (!featured.length) return null;
  return <section className="shell py-8 md:py-12" aria-labelledby="home-brands">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="store-home-overline">Curated discovery</p>
        <h2 id="home-brands" className="store-home-heading display mt-2">Shop by brand</h2>
        <p className="store-home-muted mt-2 text-sm">Explore brands available in the Aloyri catalog.</p></div>
      <Link href="/shop" className="store-home-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold">All products <span aria-hidden="true">→</span></Link>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 md:gap-4">
      {featured.map(({ name, count, image }) => (
        <Link key={name} href={`/shop?brand=${encodeURIComponent(name)}`} className="store-brand-tile group min-w-0 rounded-2xl border p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-accent)]">
          <ProductMedia product={image} sizes="(max-width: 640px) 42vw, (max-width: 1024px) 30vw, 180px" className="aspect-square rounded-xl" />
          <h3 className="mt-3 truncate text-sm font-semibold text-[var(--store-ink)]" title={name}>{name}</h3>
          <p className="mt-1 text-xs text-[var(--store-muted)]">{count} {count === 1 ? "product" : "products"} <span aria-hidden="true">→</span></p>
        </Link>
      ))}
    </div>
  </section>;
}
