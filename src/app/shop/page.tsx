import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <main className="shell py-12 md:py-18">
      <div className="grid gap-8 border-b border-black/10 pb-10 lg:grid-cols-[1fr_.7fr] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">The Aloyri edit</p>
          <h1 className="display mt-3 text-6xl sm:text-7xl">Shop skincare.</h1>
        </div>
        <p className="max-w-xl text-sm leading-7 text-black/55 lg:justify-self-end">
          A compact starting collection while the live Aloyri catalog is prepared. Product IDs are intentionally structured so this layer can connect to CRM inventory later without redesigning the storefront.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 py-7">
        {["All", "Cleanser", "Serum", "Essence", "Moisturizer", "Sunscreen"].map((item, index) => (
          <span key={item} className={`rounded-full border px-4 py-2 text-xs ${index === 0 ? "border-[#211d1a] bg-[#211d1a] text-white" : "border-black/10 bg-white/35"}`}>{item}</span>
        ))}
      </div>

      <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </main>
  );
}
