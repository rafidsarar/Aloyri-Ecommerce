import Link from "next/link";
import { ProductArtwork } from "@/components/product-artwork";
import { formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative">
          <ProductArtwork
            product={product}
            className="aspect-[4/5] rounded-[1.55rem] transition duration-500 group-hover:scale-[0.995]"
          />
          {product.bestseller ? (
            <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/75 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#713a35] backdrop-blur">
              Bestseller
            </span>
          ) : null}
        </div>

        <div className="px-1 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                {product.brand}
              </p>
              <h3 className="mt-1 truncate text-[15px] font-medium text-[#321f1c]">
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-[#321f1c]/45">{product.size}</p>
            </div>
            <p className="shrink-0 text-sm font-medium text-[#321f1c]">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
