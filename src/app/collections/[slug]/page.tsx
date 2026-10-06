import type { Metadata } from "next";
import Image from "next/image";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { MerchandisingProductGrid } from "@/components/merchandising-product-grid";
import { AnalyticsViewTracker } from "@/components/storefront-analytics-tracker";
import { mergeLiveCatalog } from "@/lib/catalog";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  applyMerchandisingRules,
  effectiveOutOfStockMode,
  selectCollectionProducts,
} from "@/lib/merchandising";
import { buildSeoMetadata } from "@/lib/seo-manager";
import { absoluteUrl } from "@/lib/site";
import {
  applyStorefrontEditorial,
  readStorefrontConfig,
  storefrontMediaUrl,
} from "@/lib/storefront-admin-store";

async function resolveCollection(slug: string) {
  const [config, preview] = await Promise.all([
    readStorefrontConfig(),
    draftMode(),
  ]);
  const collection = config.merchandising.collections.find(
    (candidate) => candidate.slug === slug,
  );
  if (!collection || (!collection.active && !preview.isEnabled)) {
    return { config, collection: null, preview: preview.isEnabled };
  }
  return { config, collection, preview: preview.isEnabled };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { collection, preview } = await resolveCollection(slug);
  if (!collection) {
    return {
      title: "Collection",
      robots: { index: false, follow: false },
    };
  }

  const imageFallback = collection.imagePath
    ? absoluteUrl(storefrontMediaUrl(collection.imagePath))
    : undefined;

  return buildSeoMetadata(
    collection.seo || {},
    {
      title: collection.title,
      description:
        collection.description ||
        "A curated Aloyri skincare collection for Bangladesh.",
      canonical: "/collections/" + collection.slug,
      index: collection.active,
      follow: true,
    },
    {
      imageFallback,
      forceNoIndex: preview || !collection.active,
    },
  );
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { config, collection } = await resolveCollection(slug);
  if (!collection) notFound();

  const catalog = await fetchCrmCatalog();
  const mode = effectiveOutOfStockMode(
    collection.outOfStockMode,
    config.merchandising.outOfStockMode,
  );

  let fallbackProducts: import("@/lib/catalog").Product[] = [];
  if (catalog.ok) {
    const decorated = applyMerchandisingRules(
      applyStorefrontEditorial(catalog.body.products, config),
      config,
    );
    fallbackProducts = selectCollectionProducts(
      collection,
      mergeLiveCatalog(decorated),
      config.merchandising.outOfStockMode,
    );
  }

  return (
    <main className="shell py-12 md:py-16">
      <AnalyticsViewTracker
        event="collection_view"
        properties={{ collectionId: collection.id }}
        context={{ collectionId: collection.id }}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            {collection.eyebrow || "Aloyri collection"}
          </p>
          <h1 className="display mt-3 text-6xl leading-[0.92] sm:text-7xl">
            {collection.title}
          </h1>
          {collection.description ? (
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#321f1c]/58">
              {collection.description}
            </p>
          ) : null}
        </div>

        {collection.imagePath ? (
          <div className="overflow-hidden rounded-[1.75rem] bg-[#f5e8e2]">
            <Image
              src={storefrontMediaUrl(collection.imagePath)}
              alt={collection.title}
              width={900}
              height={600}
              className="aspect-[3/2] h-full w-full object-cover"
              priority
            />
          </div>
        ) : null}
      </div>

      <div className="mt-12 border-t border-[#713a35]/10 pt-10">
        {catalog.ok ? (
          <MerchandisingProductGrid
            productIds={collection.productIds}
            fallbackProducts={fallbackProducts}
            outOfStockMode={mode}
            overrideProductRules={collection.outOfStockMode !== "inherit"}
            collectionId={collection.id}
          />
        ) : (
          <div className="rounded-[1.5rem] border border-[#713a35]/10 bg-[#fff4ef] p-7 text-center">
            <p className="display text-3xl">
              Live catalog is temporarily unavailable.
            </p>
            <p className="mt-3 text-sm text-[#321f1c]/50">
              Collection products are hidden until current CRM price and stock can be checked safely.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
