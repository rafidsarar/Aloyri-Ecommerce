"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import type { Product } from "@/lib/catalog";
import { hasSalePrice } from "@/lib/promotions";

export function MerchandisingProductGrid({
  productIds,
  fallbackProducts,
  outOfStockMode = "push-down",
  maxProducts,
  promotionOnly = false,
  overrideProductRules = false,
  collectionId,
  campaignId,
  placementId,
  placementKind,
  horizontalScroll = false,
  carouselId,
}: {
  productIds: string[];
  fallbackProducts: Product[];
  outOfStockMode?: "keep" | "push-down" | "hide";
  maxProducts?: number;
  promotionOnly?: boolean;
  overrideProductRules?: boolean;
  collectionId?: string;
  campaignId?: string;
  placementId?: string;
  placementKind?: string;
  horizontalScroll?: boolean;
  carouselId?: string;
}) {
  const { products, synced } = useCatalog();

  const selected = useMemo(() => {
    const source = synced ? products : fallbackProducts;
    const byId = new Map(source.map((product) => [product.id, product]));
    let list = productIds
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product));

    if (promotionOnly) {
      list = list.filter((product) => hasSalePrice(product));
    }

    list = list.filter((product) => {
      const mode =
        !overrideProductRules && product.merchandisingOutOfStockMode
          ? product.merchandisingOutOfStockMode
          : outOfStockMode;
      return !(
        mode === "hide" &&
        (product.availableStock ?? 0) <= 0
      );
    });

    list = [...list].sort((a, b) => {
      const aMode =
        !overrideProductRules && a.merchandisingOutOfStockMode
          ? a.merchandisingOutOfStockMode
          : outOfStockMode;
      const bMode =
        !overrideProductRules && b.merchandisingOutOfStockMode
          ? b.merchandisingOutOfStockMode
          : outOfStockMode;
      const aPush =
        aMode === "push-down" && (a.availableStock ?? 0) <= 0;
      const bPush =
        bMode === "push-down" && (b.availableStock ?? 0) <= 0;
      return Number(aPush) - Number(bPush);
    });

    if (maxProducts) list = list.slice(0, Math.max(1, maxProducts));
    return list;
  }, [
    fallbackProducts,
    maxProducts,
    outOfStockMode,
    productIds,
    products,
    promotionOnly,
    overrideProductRules,
    synced,
  ]);

  if (!selected.length) {
    return (
      <div className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 px-6 py-14 text-center">
        <p className="text-sm font-semibold">No available products to show.</p>
        <p className="mt-2 text-xs text-[#321f1c]/45">
          Availability is checked against the live CRM catalog.
        </p>
      </div>
    );
  }

  const cards = selected.map((product) => (
    <ProductCard
      key={product.id}
      product={product}
      collectionId={collectionId}
      campaignId={campaignId}
      placementId={placementId}
      placementKind={placementKind}
    />
  ));

  if (horizontalScroll) {
    return (
      <div className="relative min-w-0" aria-label="All products carousel">
        <div id={carouselId} tabIndex={0} role="region" aria-label="Browse all selling products horizontally"
          className="flex items-stretch snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {selected.map((product) => (
            <div key={product.id} className="w-[min(78vw,290px)] shrink-0 snap-start sm:w-[min(42vw,320px)] lg:w-[calc((100%-3rem)/4)]">
              <ProductCard product={product} collectionId={collectionId} campaignId={campaignId} placementId={placementId} placementKind={placementKind} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="storefront-product-grid grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
      {cards}
    </div>
  );
}
