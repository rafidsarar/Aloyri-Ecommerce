import { CategoryCarousel } from "@/components/category-carousel";
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
    <section className="shell home-category-section py-7 md:py-10" aria-labelledby="shop-by-category">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5">
        <div>
          <p className="store-home-overline">{eyebrow}</p>
          <h2 id="shop-by-category" className="store-home-heading display mt-2">{title}</h2>
          <p className="store-home-muted mt-3 max-w-xl text-sm leading-6">{intro}</p>
        </div>
        <Link href="/shop" className="store-home-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
          Browse all products <ArrowIcon />
        </Link>
      </div>
      <CategoryCarousel>
        {directory.map((item, index) => {
          const matching = products.filter(product => matchesCategory(product.category, item.name));
          const photo = matching.find(product =>
            (product.availableStock ?? 0) > 0 &&
            product.merchandisingOutOfStockMode !== "hide"
          );
          const familiar = familiarCategories[item.name.toLocaleLowerCase("en")];
          const style = familiar?.style || (index % 3 === 0 ? "cleanser" : index % 3 === 1 ? "moisturizer" : "sunscreen");
          return (
            <Link key={item.slug} href={item.href} className={"store-category-visual store-category-visual-" + style + " group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border p-4 transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#713a35] sm:p-5"}>
              <h3 className="display relative z-10 text-[1.25rem] leading-tight sm:text-[1.4rem] [overflow-wrap:anywhere]">{item.name}</h3>
              <div className="store-category-media relative my-3 flex h-[112px] sm:h-[128px] shrink-0 items-center justify-center overflow-hidden">
                {photo ? <div className="w-[112px] sm:w-[128px] max-w-full">
                  <ProductMedia product={photo} sizes="(min-width: 640px) 128px, 112px" className="aspect-square rounded-full" />
                </div> : <div className="store-category-orbit h-[112px] w-[112px] sm:h-[128px] sm:w-[128px] max-w-full rounded-full" aria-hidden="true" />}
              </div>
              <div className="store-category-description relative z-10 mt-auto flex items-center gap-3">
                <p className="min-w-0 flex-1 text-xs leading-5 opacity-75">{familiar?.note || (matching.length ? `Explore ${item.name.toLocaleLowerCase("en")} from Aloyri.` : "New category · products coming soon.")}</p>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/25 transition group-hover:translate-x-1" aria-hidden="true"><ArrowIcon /></span>
              </div>
            </Link>
          );
        })}
      </CategoryCarousel>
    </section>
  );
}
