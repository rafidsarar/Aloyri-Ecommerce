import { AdminShell, AdminNotice } from "@/components/admin/admin-shell";
import { OwnerDashboard } from "@/components/admin/owner-dashboard";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function AdminDashboard({searchParams}:{searchParams:Promise<{forbidden?:string}>}) {
  const admin=await requireAdminPermission("dashboard.view");
  const [config,catalog,query]=await Promise.all([readDraftStorefrontConfig(),fetchCrmCatalog(),searchParams]);
  return <AdminShell username={admin.username} title="Dashboard" subtitle="Manage your website, one task at a time.">
    {query.forbidden && <AdminNotice tone="warning">This area is unavailable.</AdminNotice>}
    {!catalog.ok && <AdminNotice tone="warning">Product sync is temporarily unavailable. You can still edit your website content.</AdminNotice>}
    <OwnerDashboard config={config} productCount={catalog.ok?catalog.body.products.length:null}/>
  </AdminShell>;
}
