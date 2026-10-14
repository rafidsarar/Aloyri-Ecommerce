import "server-only";
import { readPrivateJson, writePrivateJson } from "@/lib/storefront-admin-store";
import { emptyBrandImages, normalizeBrandImages, type BrandImageAssignments } from "@/lib/brand-image-config";

const PATH="admin/shop-brand-images.json";

export async function readBrandImageAssignments():Promise<BrandImageAssignments>{
  return normalizeBrandImages(await readPrivateJson<unknown>(PATH));
}

export async function writeBrandImageAssignments(config:BrandImageAssignments){
  return writePrivateJson(PATH,normalizeBrandImages(config));
}

export { emptyBrandImages };
