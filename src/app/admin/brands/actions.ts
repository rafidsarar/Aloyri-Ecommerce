"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { uploadStorefrontMedia, writeAdminAuditEvent } from "@/lib/storefront-admin-store";
import { readBrandImageAssignments, writeBrandImageAssignments } from "@/lib/brand-image-store";
import { withAtomicRecordMutation } from "@/lib/structured-record-store";

function fail(message:string):never {
  redirect("/admin/brands?error="+encodeURIComponent(message.slice(0,160)));
}

/** Ecommerce may edit brand pictures, never brand names or directory membership. */
export async function saveBrandPhoto(formData:FormData){
  const admin=await requireAdminPermission("merchandising.edit");
  await requireAdminPermission("media.edit");
  const brandId=String(formData.get("brandId")||"").trim();
  const crm=await fetchCrmCatalog();
  if(!crm.ok)fail("Cannot verify brands in CRM right now. No changes were saved.");
  const brand=crm.body.brands.find(item=>item.id===brandId);
  if(!brand)fail("This brand is not in CRM anymore. Refresh the brand list.");
  const remove=formData.get("remove")==="on";
  const file=formData.get("image");
  let pathname:string|undefined;
  if(!remove){
    if(!(file instanceof File)||!file.size)fail("Choose an image, or select Remove picture.");
    if(file.size>4*1024*1024)fail("Brand images must be 4 MB or smaller.");
    try{pathname=await uploadStorefrontMedia(file)}
    catch(error){fail(error instanceof Error?error.message:"Could not upload brand image.")}
  }
  try{
    await withAtomicRecordMutation(async()=>{
      const config=await readBrandImageAssignments();
      if(remove)delete config.images[brandId];
      else config.images[brandId]=pathname!;
      await writeBrandImageAssignments(config);
      await writeAdminAuditEvent(admin.username,remove?"brands.photo_removed":"brands.photo_updated",
        (remove?"Removed":"Updated")+" storefront picture for CRM brand "+brand.name,
        {scope:"merchandising",target:brandId});
    });
  }catch(error){
    console.error("Brand image assignment failed",error);
    fail("Image assignment was not saved. Please retry.");
  }
  revalidatePath("/");
  revalidatePath("/admin/brands");
  redirect("/admin/brands?saved=1");
}
