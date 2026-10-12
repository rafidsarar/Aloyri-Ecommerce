import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-auth";

/** Old bookmarks lead to ordinary edit forms. No builder interface remains. */
export default async function PreviousWebsiteEditor({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  await requireAdminPermission("homepage.view");
  const query=await searchParams;
  const pages=new Set(["about","shipping","returns","contact","faq","privacy","terms"]);
  let destination="/admin/homepage";
  if(query.workspace==="settings")destination="/admin/settings";
  else if(query.workspace==="media")destination="/admin/media";
  else if(query.workspace==="pages")destination=pages.has(query.content || "")?"/admin/pages/"+query.content:"/admin/pages";
  else if(query.workspace==="campaigns")destination="/admin/merchandising"+((query.kind==="campaign"||query.kind==="collection") && query.id?"/"+(query.kind==="campaign"?"campaigns":"collections")+"/"+encodeURIComponent(query.id):"");
  else if(pages.has(query.page || ""))destination="/admin/pages/"+query.page;
  const notice=new URLSearchParams();
  for(const key of ["saved","error","warning","deleted"])if(query[key])notice.set(key,query[key]!);
  redirect(destination+(notice.size?"?"+notice.toString():""));
}
