import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop the Aloyri skincare edit.",
};

export default function ShopPage() {
  const categories = ["All", "Cleanser", "Serum", "Essence", "Moisturizer", "Sunscreen", "Balm"];

  return (
    <main>
      <section className="shell pt-12 md:pt-16">
        <p className="eyebrow">The Aloyri edit</p>
        <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h1 className="display-title max-w-3xl">Skincare selected with intention.</h1>
          <p className="max-w-md text-sm leading-6 text-black/55">
            This first catalog is a storefront foundation. Product data will later be connected to your operational catalog without exposing CRM internals.
          </p>
        </div>
        <div className="mt-10 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category, index) => (
            <span key={category} className={index === 0 ? "filter-pill active" : "filter-pill"}>{category}</span>
          ))}
        </div>
      </section>

      <section className="shell mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:gap-y-14">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </section>
    </main>
  );
}
