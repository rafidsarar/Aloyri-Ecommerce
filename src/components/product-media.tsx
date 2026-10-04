"use client";

import { useState } from "react";
import { ProductArtwork } from "@/components/product-artwork";
import type { Product } from "@/lib/catalog";
import { getVerifiedProductContent } from "@/lib/product-verification";

export function ProductMedia({
  product,
  className = "",
  priority = false,
}: {
  product: Product;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const verified = getVerifiedProductContent(product.id);
  const photo = verified?.photo;

  return (
    <div className={`relative overflow-hidden bg-[#fffdfb] ${className}`}>
      <ProductArtwork
        product={product}
        className="absolute inset-0 h-full w-full"
      />

      {photo && !failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fffdfb] p-[7%]">
          <img
            src={photo.src}
            alt={photo.alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain transition duration-500"
          />
        </div>
      ) : null}
    </div>
  );
}
