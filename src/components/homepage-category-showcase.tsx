import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import type { Product } from "@/lib/catalog";

const categories = [
  { key: "cleanser", category: "Cleanser", step: "01 / CLEANSE", title: "Cleansers", note: "A fresh start for every routine.", href: "/category/cleansers" },
  { key: "moisturizer", category: "Moisturizer", step: "02 / HYDRATE", title: "Moisturizers", note: "Find the comfort and texture you love.", href: "/category/moisturizers" },
  { key: "sunscreen", category: "Sunscreen", step: "03 / PROTECT", title: "Sunscreen", note: "Make everyday SPF effortless.", href: "/category/sunscreen" },
] as const;

export function HomepageCategoryShowcase({ products }: { products: Product[] }) {
  return (
    <section className="shell py-9 md:py-14" aria-labelledby="shop-by-category">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9">
        <div>
          <p className="store-home-overline">A simpler way to shop</p>
          <h2 id="shop-by-category" className="store-home-heading display mt-2">Find your daily essentials.</h2>
          <p className="store-home-muted mt-3 max-w-xl text-sm leading-6">Start with a step in your routine, then explore the products that fit.</p>
        </div>
        <Link href="/shop" className="store-home-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
          View all skincare <ArrowIcon />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 md:gap-5">
        {categories.map((item) => {
          const photo = products.find((product) =>
            product.category.toLowerCase() === item.category.toLowerCase() &&
            (product.availableStock ?? 0) > 0 &&
            product.merchandisingOutOfStockMode !== "hide"
          );
          return (
            <Link key={item.key} href={item.href} className={"store-category-visual store-category-visual-" + item.key + " group relative flex min-h-[290px] flex-col justify-between overflow-hidden rounded-[1.65rem] border p-5 sm:min-h-[330px] sm:p-6 lg:min-h-[370px] lg:p-8"}>
              <span className="relative z-10 text-[10px] font-semibold tracking-[.21em]">{item.step}</span>
              {photo ? (
                <div className="store-category-product pointer-events-none absolute right-[-6%] top-[13%] w-[74%] max-w-[330px] sm:right-[-12%] sm:top-[17%] lg:right-[-6%]">
                  <ProductMedia product={photo} sizes="(max-width: 640px) 65vw, (max-width: 1024px) 25vw, 310px" className="aspect-square rounded-full" />
                </div>
              ) : (
                <div className="store-category-orbit pointer-events-none absolute right-[-20%] top-[15%] aspect-square w-[85%] rounded-full" aria-hidden="true" />
              )}
              <div className="relative z-10 mt-auto max-w-[75%] pt-32">
                <h3 className="display text-[clamp(1.8rem,3vw,2.8rem)] leading-tight">{item.title}</h3>
                <p className="mt-2 max-w-[13rem] text-xs leading-5 opacity-75 sm:text-sm">{item.note}</p>
                <span className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/25 transition group-hover:translate-x-1" aria-hidden="true"><ArrowIcon /></span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
