import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import { catalogCategories, categoryHref, categoryKey, categoryMatches } from "@/lib/storefront-categories";
import type { Product } from "@/lib/catalog";

const featuredCategories: Record<string, { key: string; title: string; note: string }> = {
  cleanser: { key: "cleanser", title: "Cleansers", note: "A fresh start for every routine." },
  moisturizer: { key: "moisturizer", title: "Moisturizers", note: "Find the comfort and texture you love." },
  sunscreen: { key: "sunscreen", title: "Sunscreen", note: "Make everyday SPF effortless." },
};

export function HomepageCategoryShowcase({
  products,
  eyebrow,
  title,
  intro,
  categoryOrder = [],
  synced = true,
}: {
  products: Product[];
  eyebrow: string;
  title: string;
  intro: string;
  categoryOrder?: string[];
  synced?: boolean;
}) {
  const categories = synced ? catalogCategories(products, categoryOrder) : [];

  return (
    <section className="shell py-9 md:py-14" aria-labelledby="shop-by-category">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9">
        <div>
          <p className="store-home-overline">{eyebrow}</p>
          <h2 id="shop-by-category" className="store-home-heading display mt-2">{title}</h2>
          <p className="store-home-muted mt-3 max-w-xl text-sm leading-6">{intro}</p>
        </div>
        <Link href="/shop" className="store-home-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
          View all skincare <ArrowIcon />
        </Link>
      </div>
      {!synced || !categories.length ? (
        <div className="rounded-[1.5rem] border border-[#713a35]/10 bg-[#fffaf7] px-6 py-9 text-center text-sm text-[#654b45]" role="status">
          {synced ? "There are no active product categories available right now." : "Live categories are temporarily unavailable. Please try browsing the shop again shortly."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {categories.map((category, index) => {
            const design = featuredCategories[categoryKey(category)];
            const key = design?.key ?? "other";
            const photo = products.find((product) =>
              categoryMatches(product.category, category) &&
              (product.availableStock ?? 0) > 0 &&
              product.merchandisingOutOfStockMode !== "hide"
            );
            return (
              <Link key={categoryKey(category)} href={categoryHref(category)} className={"store-category-visual store-category-visual-" + key + " group relative flex min-h-[290px] flex-col justify-between overflow-hidden rounded-[1.65rem] border p-5 sm:min-h-[330px] sm:p-6 lg:min-h-[370px] lg:p-8"}>
                <span className="relative z-10 text-[10px] font-semibold tracking-[.21em]">{String(index + 1).padStart(2, "0")} / EXPLORE</span>
                {photo ? (
                  <div className="store-category-product pointer-events-none absolute right-[-6%] top-[13%] w-[74%] max-w-[330px] sm:right-[-12%] sm:top-[17%] lg:right-[-6%]">
                    <ProductMedia product={photo} sizes="(max-width: 640px) 65vw, (max-width: 1024px) 35vw, 310px" className="aspect-square rounded-full" />
                  </div>
                ) : (
                  <div className="store-category-orbit pointer-events-none absolute right-[-20%] top-[15%] aspect-square w-[85%] rounded-full" aria-hidden="true" />
                )}
                <div className="relative z-10 mt-auto max-w-[75%] pt-32">
                  <h3 className="display break-words text-[clamp(1.65rem,3vw,2.8rem)] leading-tight">{design?.title ?? category}</h3>
                  <p className="mt-2 max-w-[13rem] text-xs leading-5 opacity-75 sm:text-sm">{design?.note ?? (photo ? "Explore this skincare category." : "Discover this category and check availability.")}</p>
                  <span className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/25 transition group-hover:translate-x-1" aria-hidden="true"><ArrowIcon /></span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
