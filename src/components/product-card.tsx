"use client";

import Link from "next/link";
import { ProductMedia } from "@/components/product-media";
import { AddToCart } from "@/components/add-to-cart";
import { useCatalogProduct } from "@/components/catalog-provider";
import {
  formatPrice,
  productStockLabel,
  type Product,
} from "@/lib/catalog";
import { hasSalePrice, salePriceFor } from "@/lib/promotions";
import { trackStorefrontEvent } from "@/lib/analytics";

export function ProductCard({
  product: fallback,
  collectionId,
  campaignId,
  placementId,
  placementKind,
}: {
  product: Product;
  collectionId?: string;
  campaignId?: string;
  placementId?: string;
  placementKind?: string;
}) {
  const { product: liveProduct, synced } = useCatalogProduct(fallback.id);

  if (synced && !liveProduct) return null;
  const product = liveProduct ?? fallback;
  const stockLabel = synced ? productStockLabel(product) : "Checking live stock";
  const salePrice = salePriceFor(product);
  const onSale = synced && hasSalePrice(product);

  return (
    <article className="group store-product-card">
      <Link
        href={`/product/${product.slug}`}
        className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#713a35]"
        onClick={() => {
          trackStorefrontEvent(
            collectionId ? "collection_product_click" : "product_click",
            {
              productId: product.id,
              ...(collectionId ? { collectionId } : {}),
              ...(campaignId ? { campaignId } : {}),
              ...(placementId ? { placementId } : {}),
              ...(placementKind ? { placementKind } : {}),
            },
            {
              collectionId,
              campaignId,
              placementId,
              placementKind,
            },
          );
          if (placementId) {
            trackStorefrontEvent(
              "merchandising_click",
              {
                productId: product.id,
                placementId,
                ...(placementKind ? { placementKind } : {}),
              },
              { placementId, placementKind, collectionId, campaignId },
            );
          }
        }}
      >
        <div className="relative">
          <ProductMedia
            product={product}
            className="aspect-[4/5] rounded-[1.55rem] transition duration-500 group-hover:scale-[0.995]"
          />
          {onSale ? (
            <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-[#713a35] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
              {product.promotionBadge || "Sale"}
            </span>
          ) : product.merchandisingBadge ? (
            <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/80 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#713a35] backdrop-blur">
              {product.merchandisingBadge}
            </span>
          ) : product.bestseller ? (
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
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                {product.brand}
              </p>
              <h3 className="mt-1 line-clamp-2 min-h-12 text-[15px] leading-6 font-medium text-[#321f1c]">
                {product.name}
              </h3>
              <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[#321f1c]/60">
                {product.bestFor || product.texture || "Explore product details"}
              </p>
              <p className="mt-1 text-xs text-[#321f1c]/45">
                {product.size} · {stockLabel}
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-medium text-[#321f1c]">
                {synced ? formatPrice(salePrice) : "—"}
              </p>
              {onSale ? (
                <p className="mt-0.5 text-[11px] text-[#321f1c]/38 line-through">
                  {formatPrice(product.price)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
      <div className="store-product-card-action mt-3">
        <AddToCart productId={product.id} compact ariaLabel={`Add ${product.name} to cart`} />
      </div>
    </article>
  );
}
