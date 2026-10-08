"use client";

import Image from "next/image";
import { useState } from "react";
import { ProductArtwork } from "@/components/product-artwork";
import type { Product } from "@/lib/catalog";
import { getVerifiedProductContent } from "@/lib/product-verification";

export function ProductMedia({
  product,
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 46vw, (max-width: 1024px) 34vw, 360px",
}: {
  product: Product;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const verified = getVerifiedProductContent(product.id);
  const photo = product.mediaPath
    ? {
        src: "/api/storefront-media/" + (product.mediaPath.startsWith("media/") ? product.mediaPath.slice(6) : product.mediaPath),
        alt: `${product.brand} ${product.name}`,
      }
    : verified?.photo;

  return (
    <div className={`relative overflow-hidden bg-[#fffdfb] ${className}`}>
      <ProductArtwork
        product={product}
        className="absolute inset-0 h-full w-full"
      />

      {photo && !failed ? (
        <div className="absolute inset-0 bg-[#fffdfb]">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            priority={priority}
            sizes={sizes}
            onError={() => setFailed(true)}
            className="object-contain p-[7%]"
          />
        </div>
      ) : null}
    </div>
  );
}
