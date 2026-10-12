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
    <section className="shell py-9 md:py-14" aria-labelledby="shop-by-category">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9">
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
            <Link key={item.slug} href={item.href} className={"store-category-visual store-category-visual-" + style + " group relative flex min-h-[245px] w-[min(72vw,290px)] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[1.65rem] border p-5 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#713a35] sm:min-h-[275px] sm:w-[280px] sm:shrink-0 sm:p-6 lg:min-h-[305px] lg:p-8"}>
              <h3 className="display relative z-10 text-[clamp(1.55rem,2.4vw,2rem)] leading-tight">{item.name}</h3>
              <div className="store-category-media relative my-4 flex h-[180px] shrink-0 items-center justify-center overflow-hidden">
                {photo ? <div className="w-[170px] max-w-full">
                  <ProductMedia product={photo} sizes="170px" className="aspect-square rounded-full" />
                </div> : <div className="store-category-orbit h-[170px] w-[170px] max-w-full rounded-full" aria-hidden="true" />}
              </div>
              <div className="store-category-description relative z-10 mt-auto">
                <p className="mt-2 max-w-[13rem] text-xs leading-5 opacity-75 sm:text-sm">{familiar?.note || (matching.length ? `Explore ${item.name.toLocaleLowerCase("en")} from Aloyri.` : "New category · products coming soon.")}</p>
                <span className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/25 transition group-hover:translate-x-1" aria-hidden="true"><ArrowIcon /></span>
              </div>
            </Link>
          );
        })}
      </CategoryCarousel>
    </section>
  );
}
