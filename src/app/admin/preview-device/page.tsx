import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-auth";
export default async function PreviousPreview(){await requireAdminPermission("homepage.view");redirect("/admin/homepage");}
