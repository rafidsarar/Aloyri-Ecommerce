import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="product-visual aspect-[4/5]" style={{ background: product.visual }}>
          <div className="product-bottle" aria-hidden="true">
            <span>ALOYRI</span>
            <small>{product.category}</small>
          </div>
          {product.newArrival && <span className="product-badge">New</span>}
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-black/45">{product.category}</p>
            <h3 className="mt-1 text-[15px] font-medium">{product.name}</h3>
            <p className="mt-1 text-xs text-black/45">{product.size}</p>
          </div>
          <div className="text-right text-sm">
            <p>{formatPrice(product.price)}</p>
            {product.compareAtPrice && <p className="mt-1 text-xs text-black/35 line-through">{formatPrice(product.compareAtPrice)}</p>}
          </div>
        </div>
      </Link>
    </article>
  );
}
