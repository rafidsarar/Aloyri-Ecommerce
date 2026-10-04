import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]" style={{ background: product.visual }}>
          {product.newArrival ? <span className="absolute left-4 top-4 rounded-full bg-white/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] backdrop-blur">New</span> : null}
          <div className="absolute left-1/2 top-1/2 h-[52%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[1.8rem_1.8rem_1.1rem_1.1rem] bg-white/72 shadow-[0_28px_55px_rgba(55,38,28,.15)] transition duration-500 group-hover:-translate-y-[52%]">
            <div className="mx-auto mt-[20%] h-[12%] w-[48%] rounded bg-black/70" />
            <div className="mt-[58%] text-center">
              <p className="text-[8px] uppercase tracking-[0.25em] text-black/45">Aloyri</p>
              <p className="display mt-1 text-lg leading-none">{product.category}</p>
            </div>
          </div>
        </div>
        <div className="px-1 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-black/42">{product.brand}</p>
              <h3 className="mt-1 text-sm font-medium">{product.name}</h3>
              <p className="mt-1 text-xs text-black/45">{product.size}</p>
            </div>
            <div className="text-right text-sm">
              <p>{formatPrice(product.price)}</p>
              {product.compareAtPrice ? <p className="mt-1 text-xs text-black/35 line-through">{formatPrice(product.compareAtPrice)}</p> : null}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
