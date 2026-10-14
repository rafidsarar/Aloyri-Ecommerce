import { safeHomepageImagePath } from "@/lib/homepage-builder";

export type BrandImageAssignments={version:1;images:Record<string,string>};
export const emptyBrandImages=():BrandImageAssignments=>({version:1,images:{}});

/** Validate persisted paths; never trust brand names or uploaded URL strings. */
export function normalizeBrandImages(value:unknown):BrandImageAssignments{
  const source=value&&typeof value==='object'?(value as {images?:unknown}).images:null;
  const images:Record<string,string>={};
  if(source&&typeof source==='object'&&!Array.isArray(source)){
    for(const [id,entry] of Object.entries(source)){
      const path=safeHomepageImagePath(entry);
      if(id&&id.length<=1024&&!/[\u0000-\u001f/]/.test(id)&&path)images[id]=path;
    }
  }
  return {version:1,images};
}
