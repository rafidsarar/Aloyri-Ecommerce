"use client";

import Link from "next/link";
import { ProductMedia } from "@/components/product-media";
import { useCatalogProduct } from "@/components/catalog-provider";
import {
  formatPrice,
  productStockLabel,
  type Product,
} from "@/lib/catalog";

export function ProductCard({ product: fallback }: { product: Product }) {
  const { product: liveProduct, synced } = useCatalogProduct(fallback.id);

  if (synced && !liveProduct) return null;
  const product = liveProduct ?? fallback;
  const stockLabel = synced ? productStockLabel(product) : "Checking live stock";

  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative">
          <ProductMedia
            product={product}
            className="aspect-[4/5] rounded-[1.55rem] transition duration-500 group-hover:scale-[0.995]"
          />
          {product.bestseller ? (
            <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/75 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#713a35] backdrop-blur">
              Bestseller
            </span>
          ) : null}
          {synced && product.availableStock === 0 ? (
            <span className="absolute right-4 top-4 rounded-full bg-[#321f1c]/82 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
              Out of stock
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
              <p className="mt-1 text-xs text-[#321f1c]/45">
                {product.size} · {stockLabel}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium text-[#321f1c]">
              {synced ? formatPrice(product.price) : "—"}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
