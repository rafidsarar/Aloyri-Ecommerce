import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import type { Product } from "@/lib/catalog";
import { buildCategoryDirectory, matchesCategory } from "@/lib/storefront-categories";

const familiarCategories: Record<string, { style: string; note: string }> = {
  cleanser: { style: "cleanser", note: "A fresh start for every routine." },
  cleansers: { style: "cleanser", note: "A fresh start for every routine." },
  moisturizer: { style: "moisturizer", note: "Find the comfort and texture you love." },
  moisturizers: { style: "moisturizer", note: "Find the comfort and texture you love." },
  sunscreen: { style: "sunscreen", note: "Make everyday SPF effortless." },
};

export function HomepageCategoryShowcase({ products, categories, eyebrow, title, intro }: { products: Product[]; categories: string[]; eyebrow: string; title: string; intro: string }) {
  const directory = buildCategoryDirectory(categories, products);
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
      <p className="mb-3 text-xs text-[#713a35]/55 sm:hidden">Swipe to discover every category →</p>
      <div className="store-category-gallery -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-4 md:gap-5" aria-label="Browse CRM skincare categories" tabIndex={0}>
        {directory.map((item, index) => {
          const matching = products.filter(product => matchesCategory(product.category, item.name));
          const photo = matching.find(product =>
            (product.availableStock ?? 0) > 0 &&
            product.merchandisingOutOfStockMode !== "hide"
          );
          const familiar = familiarCategories[item.name.toLocaleLowerCase("en")];
          const style = familiar?.style || (index % 3 === 0 ? "cleanser" : index % 3 === 1 ? "moisturizer" : "sunscreen");
          return (
            <Link key={item.slug} href={item.href} className={"store-category-visual store-category-visual-" + style + " group relative flex min-h-[290px] w-[min(78vw,320px)] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[1.65rem] border p-5 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#713a35] sm:min-h-[330px] sm:w-auto sm:shrink sm:p-6 lg:min-h-[370px] lg:p-8"}>
              <span className="relative z-10 text-[10px] font-semibold tracking-[.21em]">{String(index + 1).padStart(2, "0")} / EXPLORE</span>
              {photo ? (
                <div className="store-category-product pointer-events-none absolute right-[-6%] top-[13%] w-[74%] max-w-[330px] sm:right-[-12%] sm:top-[17%] lg:right-[-6%]">
                  <ProductMedia product={photo} sizes="(max-width: 640px) 65vw, (max-width: 1024px) 25vw, 310px" className="aspect-square rounded-full" />
                </div>
              ) : (
                <div className="store-category-orbit pointer-events-none absolute right-[-20%] top-[15%] aspect-square w-[85%] rounded-full" aria-hidden="true" />
              )}
              <div className="relative z-10 mt-auto max-w-[75%] pt-32">
                <h3 className="display text-[clamp(1.8rem,3vw,2.8rem)] leading-tight">{item.name}</h3>
                <p className="mt-2 max-w-[13rem] text-xs leading-5 opacity-75 sm:text-sm">{familiar?.note || (matching.length ? `Explore ${item.name.toLocaleLowerCase("en")} from Aloyri.` : "New category · products coming soon.")}</p>
                <span className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/25 transition group-hover:translate-x-1" aria-hidden="true"><ArrowIcon /></span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
