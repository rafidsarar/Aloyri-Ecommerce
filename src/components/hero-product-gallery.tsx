"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { ProductMedia } from "@/components/product-media";
import { AddToCart } from "@/components/add-to-cart";
import { volatileStorage } from "@/lib/volatile-storage";
import { HERO_BANNER_CLAIM_KEY, claimOffer, type HeroBannerOffer } from "@/lib/hero-banner-offers";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export function HeroProductGallery({ products, offer }: { products: Product[]; offer: HeroBannerOffer }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const count = products.length;
  const product = products[active] || products[0];

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        setActive(index => (index + 1) % count);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  function rememberOffer() {
    if (!product || !offer.productIds.includes(product.id)) return;
    const claim = claimOffer(offer);
    if (claim) volatileStorage.setItem(HERO_BANNER_CLAIM_KEY, JSON.stringify(claim));
  }

  if (!product) return null;
  return (
    <div className="hero-products flex h-full min-w-0 flex-col items-center justify-center gap-3"
      aria-label="Featured banner products"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
      onTouchStart={event => { setPaused(true); startX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={event => {
        if (startX.current !== null && count > 1) {
          const distance = (event.changedTouches[0]?.clientX ?? startX.current) - startX.current;
          if (Math.abs(distance) > 45) setActive(index => (index + (distance < 0 ? 1 : count - 1)) % count);
        }
        startX.current = null; setPaused(false);
      }}>
      <div className="hero-product-panel w-full" key={product.id} aria-live="polite">
        <Link href={`/product/${product.slug}`} onClick={rememberOffer}
          className="group block min-w-0" aria-label={`View ${product.name}`}>
          <ProductMedia product={product} sizes="(max-width: 640px) 75vw, 350px"
            className="hero-product-photo mx-auto aspect-[4/3] w-full max-w-[315px] rounded-2xl" />
          <p className="mt-2 truncate text-center text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--store-muted)]">{product.brand}</p>
          <p className="mx-auto max-w-[30ch] truncate text-center text-sm font-semibold text-[var(--store-ink)] group-hover:underline">{product.name}</p>
        </Link>
        <div className="mt-1 text-center text-sm font-semibold text-[var(--store-ink)]">
          {formatPrice(product.price)}
          {offer.mode === "checkout" && offer.promotionCode && offer.productIds.includes(product.id) ?
            <span className="ml-2 text-[11px] font-normal text-[var(--store-muted)]">5% off with CRM offer at checkout</span> : null}
        </div>
        <div className="mx-auto mt-3 max-w-[220px]"><AddToCart productId={product.id} compact bannerOffer={offer} /></div>
      </div>
      {count > 1 ? <div className="mt-1 flex items-center justify-center gap-3" aria-label="Choose featured product">
        <button type="button" className="hero-product-nav" aria-label="Previous featured product"
          onClick={() => setActive(index => (index + count - 1) % count)}>←</button>
        <span className="text-xs tabular-nums text-[var(--store-muted)]">{active + 1} / {count}</span>
        <button type="button" className="hero-product-nav" aria-label="Next featured product"
          onClick={() => setActive(index => (index + 1) % count)}>→</button>
      </div> : null}
    </div>
  );
}
