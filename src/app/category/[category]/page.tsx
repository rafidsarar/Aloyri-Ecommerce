import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopClient } from "@/components/shop-client";
import { safeJsonLd } from "@/lib/seo";
import { categorySeoMetadata } from "@/lib/seo-manager";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";
import { absoluteUrl } from "@/lib/site";

const categories = {
  cleansers: {
    name: "Cleanser",
    title: "Cleansers",
    description:
      "Shop Aloyri facial cleansers with live BDT pricing and current CRM availability.",
    intro:
      "Start the routine with a focused selection of facial cleansers and live stock visibility.",
  },
  moisturizers: {
    name: "Moisturizer",
    title: "Moisturizers",
    description:
      "Shop Aloyri moisturizers with live BDT pricing and current CRM availability.",
    intro:
      "Choose a moisturising step based on the texture and routine feel you prefer.",
  },
  sunscreen: {
    name: "Sunscreen",
    title: "Sunscreen",
    description:
      "Shop Aloyri daily sunscreen with live BDT pricing and current CRM availability.",
    intro:
      "Finish the morning routine with daily sunscreen and clear product information.",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(categories).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const entry = categories[category as keyof typeof categories];
  if (!entry) return {};
  const config = await readStorefrontConfig();
  return categorySeoMetadata(
    config,
    category as keyof typeof config.seo.categories,
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const entry = categories[category as keyof typeof categories];
  if (!entry) notFound();

  const breadcrumb = {
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
        name: entry.title,
        item: absoluteUrl("/category/" + category),
      },
    ],
  };

  return (
    <main className="shell py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }}
      />
      <div className="grid gap-8 border-b border-[#713a35]/10 pb-10 lg:grid-cols-[1fr_.7fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            Shop by routine
          </p>
          <h1 className="display mt-3 text-6xl leading-[0.92] sm:text-7xl">
            {entry.title}.
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[#321f1c]/52 lg:justify-self-end">
          {entry.intro}
        </p>
      </div>
      <ShopClient initialCategory={entry.name} lockCategory />
    </main>
  );
}
