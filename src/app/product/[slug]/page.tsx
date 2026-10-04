import type { Metadata } from "next";
import { LiveProductPage } from "@/components/live-product-page";
import { getProduct } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  return product
    ? {
        title: `${product.brand} ${product.name}`,
        description: product.description,
      }
    : {
        title: "Skincare product",
        description: "Aloyri skincare product.",
      };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LiveProductPage slug={slug} fallback={getProduct(slug) ?? null} />;
}
