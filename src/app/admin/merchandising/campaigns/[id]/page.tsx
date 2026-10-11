import { AdminShell } from "@/components/admin/admin-shell";
import { WebsiteCampaignEditor } from "@/components/admin/website-campaign-editor";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function CampaignEditor({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("merchandising.view");
  const [{ id }, query, config, catalog] = await Promise.all([
    params, searchParams, readDraftStorefrontConfig(), fetchCrmCatalog(),
  ]);
  const campaign = config.merchandising.campaigns.find(item => item.id === id);
  return (
    <AdminShell username={admin.username} title={id === "new" ? "New campaign" : campaign?.title || "Campaign editor"}
      subtitle="Campaign creative and product presentation remain website-owned. Actual sale prices stay controlled by CRM.">
      <WebsiteCampaignEditor id={id} query={query} config={config} catalog={catalog} />
    </AdminShell>
  );
}
