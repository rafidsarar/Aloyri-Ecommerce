import { CategoryCarousel } from "@/components/category-carousel";
import { ArrowIcon } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import { ProductMedia } from "@/components/product-media";
import type { Product } from "@/lib/catalog";
import type { CrmBrand } from "@/lib/crm-brand-directory";

export function HomepageBrandShowcase({
  products,brands,images,
}:{
  products:Product[];
  brands:CrmBrand[];
  images:Record<string,string>;
}){
  // Brand names/identities are CRM-only. Ecommerce can change pictures, not the list.
  const featured=brands.map(brand=>{
    const matching=products.filter(product=>
      product.brand.trim().toLocaleLowerCase("en")===brand.name.toLocaleLowerCase("en") &&
      (product.availableStock??0)>0 && product.merchandisingOutOfStockMode!=="hide"
    );
    return {...brand,count:matching.length,product:matching[0],mediaPath:images[brand.id]};
  }).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,6);
  if(!featured.length)return null;
  return <section className="shell home-brand-section py-7 md:py-10" aria-labelledby="home-brands">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5">
      <div><p className="store-home-overline">Curated discovery</p>
        <h2 id="home-brands" className="store-home-heading display mt-2">Shop by brand</h2>
        <p className="store-home-muted mt-3 max-w-xl text-sm leading-6">Explore brands available in the Aloyri catalog.</p></div>
      <Link href="/shop" className="store-home-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold">Browse all products <ArrowIcon /></Link>
    </div>
    <CategoryCarousel kind="brands">
      {featured.map(({id,name,count,product,mediaPath}, index)=>(
        <Link key={id} href={`/shop?brand=${encodeURIComponent(name)}`} className={"store-category-visual store-category-visual-" + ["cleanser", "moisturizer", "sunscreen"][index % 3] + " group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border p-4 transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#713a35] sm:p-5"}>
          <h3 className="display relative z-10 text-[1.25rem] leading-tight sm:text-[1.4rem] [overflow-wrap:anywhere]">{name}</h3>
          <div className="store-category-media relative my-3 flex h-[112px] sm:h-[128px] shrink-0 items-center justify-center overflow-hidden">
            {mediaPath ? <div className="relative h-[112px] w-[112px] sm:h-[128px] sm:w-[128px] max-w-full overflow-hidden rounded-full bg-[#fffdfb]">
              <Image src={"/api/storefront-media/"+mediaPath.slice(6)} alt={name+" brand"} fill sizes="(min-width: 640px) 128px, 112px" className="object-contain p-[7%]" />
            </div> : product ? <div className="w-[112px] sm:w-[128px] max-w-full">
              <ProductMedia product={product} sizes="(min-width: 640px) 128px, 112px" className="aspect-square rounded-full" />
            </div> : <div className="store-category-orbit h-[112px] w-[112px] sm:h-[128px] sm:w-[128px] max-w-full rounded-full" aria-hidden="true" />}
          </div>
          <div className="store-category-description relative z-10 mt-auto flex items-center gap-3">
            <p className="min-w-0 flex-1 text-xs leading-5 opacity-75">{count?count+" "+(count===1?"product":"products"):"Products coming soon"}</p>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/25 transition group-hover:translate-x-1" aria-hidden="true"><ArrowIcon /></span>
          </div>
        </Link>
      ))}
    </CategoryCarousel>
  </section>;
}
