import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VisualPageSections } from "@/components/visual-page-sections";
import { ShopClient } from "@/components/shop-client";
import { safeJsonLd } from "@/lib/seo";
import { buildSeoMetadata, categorySeoMetadata } from "@/lib/seo-manager";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { resolveCatalogCategory } from "@/lib/storefront-categories";
import { absoluteUrl } from "@/lib/site";

// CRM is the source of truth: a category created after deployment must
// resolve immediately without rebuilding or updating static route lists.
export const dynamic = "force-dynamic";

const legacySeo = ["cleansers", "moisturizers", "sunscreen"] as const;
type LegacySeoKey = (typeof legacySeo)[number];
function isLegacySeoKey(value: string): value is LegacySeoKey {
  return (legacySeo as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const [config, crm] = await Promise.all([readStorefrontConfig(), fetchCrmCatalog()]);
  if (!crm.ok) return { title: "Shop categories | Aloyri", robots: { index: false, follow: true } };
  const entry = resolveCatalogCategory(category, crm.body.categories, crm.body.products);
  if (!entry) return { title: "Category not found | Aloyri", robots: { index: false, follow: true } };
  if (isLegacySeoKey(entry.slug)) return categorySeoMetadata(config, entry.slug);
  const description = `Browse ${entry.name} at Aloyri with CRM-synced products, current BDT prices and availability in Bangladesh.`;
  const hasActiveProducts = crm.body.products.some(product =>
    product.active && product.category.trim().toLocaleLowerCase("en") === entry.name.toLocaleLowerCase("en"),
  );
  return buildSeoMetadata({}, {
    title: `${entry.name} | Aloyri`,
    description,
    canonical: entry.href,
    index: hasActiveProducts,
    follow: true,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const [{ category }, config, crm] = await Promise.all([
    params,
    readStorefrontConfig(),
    fetchCrmCatalog(),
  ]);

  if (!crm.ok) {
    return <main className="shell py-16">
      <h1 className="display text-4xl">Categories are temporarily unavailable.</h1>
      <p className="mt-4 max-w-xl text-sm leading-7">We cannot refresh the CRM catalog right now. Please try again shortly.</p>
      <Link href="/shop" className="mt-6 inline-flex rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">Browse the shop</Link>
    </main>;
  }

  const entry = resolveCatalogCategory(category, crm.body.categories, crm.body.products);
  if (!entry) notFound();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
      { "@type": "ListItem", position: 3, name: entry.name, item: absoluteUrl(entry.href) },
    ],
  };

  return (
    <>
      <main className="shell py-12 md:py-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
        <div className="grid gap-4 border-b border-[#713a35]/10 pb-6 lg:grid-cols-[1fr_.7fr] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">Shop by category</p>
            <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">{entry.name}.</h1>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[#321f1c]/52 lg:justify-self-end">
            Explore the Aloyri {entry.name.toLocaleLowerCase("en")} edit with live product availability and CRM-synced prices.
          </p>
        </div>
        <ShopClient
          initialCategory={entry.name}
          lockCategory
          searchSynonymGroups={config.merchandising.discovery.synonymGroups}
          categoryOrder={config.merchandising.discovery.categoryOrder}
          popularSearches={config.merchandising.discovery.popularSearches}
          merchandisingSortMode={config.merchandising.shopSortMode}
        />
      </main>
      <VisualPageSections layout={config.visualPages.category} />
    </>
  );
}
