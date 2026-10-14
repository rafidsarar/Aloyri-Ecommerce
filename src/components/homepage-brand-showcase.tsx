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
  return <section className="shell home-brand-section py-8 md:py-12" aria-labelledby="home-brands">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="store-home-overline">Curated discovery</p>
        <h2 id="home-brands" className="store-home-heading display mt-2">Shop by brand</h2>
        <p className="store-home-muted mt-2 text-sm">Explore brands available in the Aloyri catalog.</p></div>
      <Link href="/shop" className="store-home-text-link inline-flex min-h-11 items-center gap-2 text-sm font-semibold">All products <span aria-hidden="true">→</span></Link>
    </div>
    <div className="home-brand-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 md:gap-4">
      {featured.map(({id,name,count,product,mediaPath})=>(
        <Link key={id} href={`/shop?brand=${encodeURIComponent(name)}`} className="store-brand-tile group min-w-0 rounded-2xl border p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-accent)]">
          {mediaPath?<div className="home-brand-photo relative aspect-square overflow-hidden rounded-xl bg-[#fffdfb]">
            <Image src={"/api/storefront-media/"+mediaPath.slice(6)} alt={name+" brand"} fill sizes="(max-width: 640px) 44vw, 170px" className="object-contain p-[7%]"/>
          </div>:product?<ProductMedia product={product} sizes="170px" className="home-brand-photo aspect-square rounded-xl" />:
            <div className="home-brand-photo flex aspect-square items-center justify-center rounded-xl bg-[#f8f0eb] text-3xl font-semibold text-[#713a35]" aria-hidden="true">{name.slice(0,1)}</div>}
          <h3 className="mt-3 truncate text-sm font-semibold text-[var(--store-ink)]" title={name}>{name}</h3>
          <p className="mt-1 text-xs text-[var(--store-muted)]">{count?count+" "+(count===1?"product":"products"):"Products coming soon"} <span aria-hidden="true">→</span></p>
        </Link>
      ))}
    </div>
  </section>;
}
