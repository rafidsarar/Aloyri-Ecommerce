import type { Metadata } from "next";
import { ShopClient } from "@/components/shop-client";

export const metadata: Metadata = {
  title: "Shop skincare",
  description: "Shop Aloyri cleansers, moisturizers and sunscreen in BDT with live product availability.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;

  return (
    <main className="shell py-12 md:py-16">
      <div className="grid gap-8 border-b border-[#713a35]/10 pb-10 lg:grid-cols-[1fr_.7fr] lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            The Aloyri edit
          </p>
          <h1 className="display mt-3 text-6xl leading-[0.92] sm:text-7xl">
            Shop skincare.
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[#321f1c]/52 lg:justify-self-end">
          Cleanse, moisturize and protect with a focused collection priced in
          BDT. Use search, category filters and sorting to find the right place
          to start.
        </p>
      </div>

      <ShopClient initialCategory={category} initialQuery={q} />
    </main>
  );
}
