import { AdminShell, AdminNotice } from "@/components/admin/admin-shell";
import { WebsiteMerchandisingPanel } from "@/components/admin/website-merchandising-panel";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function MerchandisingOverviewPage() {
  const admin = await requireAdminPermission("merchandising.view");
  const [config, catalog] = await Promise.all([readDraftStorefrontConfig(), fetchCrmCatalog()]);
  return <AdminShell username={admin.username} title="Campaigns & collections" subtitle="Create a promotion or collection, choose its products and edit its content.">
    {!catalog.ok ? <AdminNotice tone="warning">The product catalog is temporarily unavailable. Saved campaign and collection content is still available.</AdminNotice> : null}
    <WebsiteMerchandisingPanel config={config} catalog={catalog} canEdit inBuilder={false} />
  </AdminShell>;
}
