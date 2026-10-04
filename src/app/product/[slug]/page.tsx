import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveProductPage } from "@/components/live-product-page";
import {
  getProduct,
  mergeLiveCatalog,
  products,
  type Product,
} from "@/lib/catalog";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { safeJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

async function resolveProduct(slug: string): Promise<Product | null> {
  const fallback = getProduct(slug) ?? null;

  try {
    const live = await fetchCrmCatalog();
    if (live.ok) {
      const merged = mergeLiveCatalog(live.body.products);
      const match = merged.find(
        (product) =>
          product.slug === slug ||
          product.id === slug ||
          (fallback && product.id === fallback.id),
      );
      if (match) return match;
      if (fallback) return null;
    }
  } catch {
    // Metadata and the page can fall back to local merchandising content.
  }

  return fallback;
}

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await resolveProduct(slug);

  if (!product) {
    return {
      title: "Skincare product",
      description: "Aloyri skincare product.",
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `${product.brand} ${product.name}`,
    description: product.description,
    alternates: {
      canonical: "/product/" + product.slug,
    },
    openGraph: {
      type: "website",
      url: "/product/" + product.slug,
      title: `${product.brand} ${product.name}`,
      description: product.description,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await resolveProduct(slug);
  const fallback = getProduct(slug) ?? product;

  if (!product && !fallback) notFound();

  const schemaProduct = product ?? fallback!;
  const availability =
    schemaProduct.availableStock === undefined
      ? undefined
      : schemaProduct.availableStock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: schemaProduct.name,
    sku: schemaProduct.id,
    description: schemaProduct.description,
    brand: {
      "@type": "Brand",
      name: schemaProduct.brand || "Aloyri",
    },
    category: schemaProduct.category,
    url: absoluteUrl("/product/" + schemaProduct.slug),
  };

  if (schemaProduct.live && availability) {
    productSchema.offers = {
      "@type": "Offer",
      url: absoluteUrl("/product/" + schemaProduct.slug),
      priceCurrency: "BDT",
      price: schemaProduct.price,
      availability,
      itemCondition: "https://schema.org/NewCondition",
    };
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: absoluteUrl("/shop"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: schemaProduct.name,
        item: absoluteUrl("/product/" + schemaProduct.slug),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <LiveProductPage slug={slug} fallback={fallback ?? null} />
    </>
  );
}
