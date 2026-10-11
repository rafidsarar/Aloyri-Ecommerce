import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-auth";
export default async function PreviousPublishing(){await requireAdminPermission("publishing.view");redirect("/admin/history");}
