"use client";

import { useRef } from "react";
import { ProductMedia } from "@/components/product-media";
import type { Product } from "@/lib/catalog";

export function ProductGallery({ product }: { product: Product }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <div className="product-gallery">
    <button type="button" className="product-gallery-open" aria-label={`Enlarge image of ${product.name}`} onClick={() => dialog.current?.showModal()}>
      <ProductMedia product={product} priority sizes="(max-width: 900px) 92vw, 620px" className="product-gallery-image" />
      <span className="product-gallery-zoom"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></svg> View closer</span>
    </button>
    <dialog ref={dialog} className="product-image-dialog" aria-label={`${product.name} enlarged image`} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="product-image-dialog-content">
        <button type="button" autoFocus className="product-image-close" onClick={() => dialog.current?.close()}>Close image <span aria-hidden="true">×</span></button>
        <ProductMedia product={product} sizes="(max-width: 800px) 95vw, 760px" className="product-image-enlarged" />
        <p>{product.brand} · {product.name}</p>
      </div>
    </dialog>
  </div>;
}
