import { AdminShell, AdminNotice } from "@/components/admin/admin-shell";
import { SimpleHomepageEditor } from "@/components/admin/simple-homepage-editor";
import { requireAdminPermission } from "@/lib/admin-auth";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function HomepageSettings({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}) {
  const admin=await requireAdminPermission("homepage.view");
  const [config,query]=await Promise.all([readDraftStorefrontConfig(),searchParams]);
  return <AdminShell username={admin.username} title="Homepage" subtitle="Change the text, images and sections customers see first.">
    {query.saved && <AdminNotice>Homepage saved. Your changes are live.</AdminNotice>}
    {query.error && <AdminNotice tone="warning">Could not save changes: {query.error}</AdminNotice>}
    <SimpleHomepageEditor config={config}/>
  </AdminShell>;
}
