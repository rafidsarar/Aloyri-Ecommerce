import Image from "next/image";
import Link from "next/link";
import { AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { saveBrandPhoto } from "./actions";
import { hasAdminPermission, requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readBrandImageAssignments } from "@/lib/brand-image-store";

export default async function AdminBrandPicturesPage({
  searchParams,
}:{
  searchParams:Promise<{saved?:string;error?:string}>;
}){
  const admin=await requireAdminPermission("merchandising.view");
  const [crm,imageConfig,query]=await Promise.all([
    fetchCrmCatalog(),
    readBrandImageAssignments(),
    searchParams,
  ]);
  const canEdit=hasAdminPermission(admin,"merchandising.edit")&&hasAdminPermission(admin,"media.edit");
  const brands=crm.ok?crm.body.brands:[];
  return <AdminShell username={admin.username} title="Shop by brands"
    subtitle="Brand names and product assignments come from Aloyri CRM. Manage only the pictures shown on your website here.">
    {query.saved?<AdminNotice>Brand picture updated on the live storefront.</AdminNotice>:null}
    {query.error?<AdminNotice tone="warning">{query.error}</AdminNotice>:null}
    {!crm.ok?<AdminNotice tone="warning">The CRM brand directory is temporarily unavailable. Pictures cannot be changed until the connection is restored.</AdminNotice>:null}
    <div className="mb-5 rounded-xl border border-black/10 bg-white p-4 text-sm leading-6 text-black/70">
      To create, rename or remove a brand, use <strong>Aloyri CRM → Inventory → Brands</strong>.
      Brand names update automatically on the website. The images below are managed only in Ecommerce.
    </div>
    {!brands.length&&crm.ok?<AdminNotice tone="neutral">There are no brands in CRM yet. Add brands in CRM Inventory to see them here.</AdminNotice>:null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {brands.map(brand=>{
        const mediaPath=imageConfig.images[brand.id];
        const count=crm.ok?crm.body.products.filter(p=>p.brand.trim().toLocaleLowerCase("en")===brand.name.toLocaleLowerCase("en")).length:0;
        return <section key={brand.id} className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="relative mb-4 flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl bg-[#faf5f1]">
            {mediaPath?<Image src={"/api/storefront-media/"+mediaPath.slice(6)} alt={brand.name+" storefront picture"} fill sizes="(max-width:768px) 80vw, 360px" className="object-contain p-3" />:
              <span className="text-sm text-black/50">No dedicated picture yet</span>}
          </div>
          <h2 className="text-base font-semibold">{brand.name}</h2>
          <p className="mt-1 mb-4 text-xs text-black/55">Managed in CRM · {count} {count===1?"product":"products"}</p>
          {canEdit?<form action={saveBrandPhoto} className="flex flex-col gap-3">
            <input type="hidden" name="brandId" value={brand.id} />
            <label className="text-xs font-medium">Brand picture
              <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full rounded-lg border border-black/15 p-2 text-sm" />
            </label>
            {mediaPath?<label className="flex items-center gap-2 text-xs text-black/70">
              <input type="checkbox" name="remove" /> Remove current picture
            </label>:null}
            <button type="submit" className="btn primary min-h-11 rounded-xl">Save picture</button>
          </form>:<p className="text-xs text-black/55">Viewing only. Picture changes require merchandising and image-edit permissions.</p>}
          <Link href={`/shop?brand=${encodeURIComponent(brand.name)}`} className="mt-3 inline-block text-xs underline underline-offset-2">View brand products ↗</Link>
        </section>;
      })}
    </div>
  </AdminShell>;
}
