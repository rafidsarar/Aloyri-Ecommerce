import { AdminShell } from "@/components/admin/admin-shell";
import { WebsiteCollectionEditor } from "@/components/admin/website-collection-editor";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function CollectionEditor({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("merchandising.view");
  const [{ id }, query, config, catalog] = await Promise.all([
    params, searchParams, readDraftStorefrontConfig(), fetchCrmCatalog(),
  ]);
  const collection = config.merchandising.collections.find(item => item.id === id);
  return (
    <AdminShell username={admin.username} title={id === "new" ? "New collection" : collection?.title || "Collection editor"}
      subtitle="Website-owned collection content and sorting. Prices, stock and promotion eligibility remain CRM authoritative.">
      <WebsiteCollectionEditor id={id} query={query} config={config} catalog={catalog} />
    </AdminShell>
  );
}
