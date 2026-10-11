import Link from "next/link";
import { AdminCard } from "@/components/admin/admin-shell";
import { campaignScheduleState } from "@/lib/merchandising";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { WebsiteCampaignEditor } from "@/components/admin/website-campaign-editor";
import { WebsiteCollectionEditor } from "@/components/admin/website-collection-editor";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

/** Campaign/collection navigation uses real saved data, never demo placeholders. */
export function WebsiteMerchandisingPanel({ config, catalog, kind, id, canEdit, query, inBuilder = true }: {
  config: StorefrontConfig;
  catalog: Awaited<ReturnType<typeof fetchCrmCatalog>>;
  kind?: "campaign" | "collection";
  id?: string;
  canEdit: boolean;
  inBuilder?: boolean;
  query?: { saved?: string; error?: string };
}) {
  const editorHref = (kind: "campaign" | "collection", id: string) => inBuilder
    ? `/admin/builder?workspace=campaigns&kind=${kind}&id=${encodeURIComponent(id)}`
    : `/admin/merchandising/${kind === "campaign" ? "campaigns" : "collections"}/${encodeURIComponent(id)}`;
  if (kind && id && canEdit) {
    const exists = id === "new" || (kind === "campaign"
      ? config.merchandising.campaigns.some(item => item.id === id)
      : config.merchandising.collections.some(item => item.id === id));
    if (exists) {
      return <div className="space-y-4">
        <Link className="inline-flex rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold" href={inBuilder ? "/admin/builder?workspace=campaigns" : "/admin/merchandising"}>← All campaigns and collections</Link>
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <p className="text-sm font-semibold">{id === "new" ? "Create" : "Edit"} {kind}</p>
          <p className="mt-1 text-xs text-black/60">Update the fields below and save your changes.</p>
        </div>
        {kind === "campaign" ? <WebsiteCampaignEditor id={id} config={config} catalog={catalog} query={query} inBuilder={inBuilder} />
          : <WebsiteCollectionEditor id={id} config={config} catalog={catalog} query={query} inBuilder={inBuilder} />}
      </div>;
    }
  }
  const campaigns = config.merchandising.campaigns;
  const collections = config.merchandising.collections;
  return (
    <div className="space-y-5" aria-label="Campaign and collection management">
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminCard><p className="text-xs text-black/60">Campaigns</p><p className="mt-1 text-2xl font-semibold">{campaigns.length}</p></AdminCard>
        <AdminCard><p className="text-xs text-black/60">Collections</p><p className="mt-1 text-2xl font-semibold">{collections.length}</p></AdminCard>
        <AdminCard><p className="text-xs text-black/60">Active collections</p><p className="mt-1 text-2xl font-semibold">{collections.filter(item => item.active).length}</p></AdminCard>
      </div>
      <section aria-labelledby="builder-campaigns-heading" className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div><h2 id="builder-campaigns-heading" className="font-semibold">Campaigns</h2><p className="mt-1 text-xs text-black/60">Edit images, product targets and timing. Selling price and real discounts remain controlled by CRM.</p></div>
          <Link href={editorHref("campaign", "new")} className="rounded-xl border border-black/15 px-3 py-2 text-xs font-semibold">New campaign</Link>
        </div>
        {campaigns.length ? <div className="divide-y divide-black/10">{campaigns.map(campaign => (
          <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{campaign.title}</p><p className="mt-1 text-xs text-black/60">{campaignScheduleState(campaign)} · {campaign.productIds.length} products</p></div>
            <Link className="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold" href={editorHref("campaign", campaign.id)}>Edit campaign</Link>
          </div>
        ))}</div> : <p className="rounded-xl bg-[#faf7f5] px-4 py-6 text-sm text-black/60">No campaigns yet. Select New campaign to get started.</p>}
      </section>
      <section aria-labelledby="builder-collections-heading" className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div><h2 id="builder-collections-heading" className="font-semibold">Collections</h2><p className="mt-1 text-xs text-black/60">Manage ordering and collection content with live CRM stock and price authority.</p></div>
          <Link href={editorHref("collection", "new")} className="rounded-xl border border-black/15 px-3 py-2 text-xs font-semibold">New collection</Link>
        </div>
        {collections.length ? <div className="divide-y divide-black/10">{collections.map(collection => (
          <div key={collection.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{collection.title}</p><p className="mt-1 text-xs text-black/60">{collection.active ? "Active" : "Hidden"} · {collection.productIds.length} products</p></div>
            <Link className="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold" href={editorHref("collection", collection.id)}>Edit collection</Link>
          </div>
        ))}</div> : <p className="rounded-xl bg-[#faf7f5] px-4 py-6 text-sm text-black/60">No collections yet.</p>}
      </section>
      <details className="rounded-xl border border-black/10 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Advanced product display settings</summary>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <Link href="/admin/merchandising/products" className="rounded-lg border border-black/15 px-3 py-2">Product merchandising →</Link>
        <Link href="/admin/merchandising/discovery" className="rounded-lg border border-black/15 px-3 py-2">Search rules →</Link>
        <Link href="/admin/merchandising/homepage" className="rounded-lg border border-black/15 px-3 py-2">Homepage product sections →</Link>
        <Link href="/admin/merchandising/recommendations" className="rounded-lg border border-black/15 px-3 py-2">Recommendations →</Link>
      </div>
      </details>
    </div>
  );
}
