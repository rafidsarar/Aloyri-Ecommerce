import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { analyzeMerchandisingHealth } from "@/lib/merchandising";
import {
  getPublishingStatus,
  readDraftStorefrontConfig,
} from "@/lib/storefront-admin-store";

export default async function MerchandisingOverviewPage() {
  const admin = await requireAdminPermission("merchandising.view");
  const [config, catalog, publishing] = await Promise.all([
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
    getPublishingStatus(),
  ]);
  const products = catalog.ok ? catalog.body.products : [];
  const report = analyzeMerchandisingHealth(config, products);
  const activeCollections = config.merchandising.collections.filter(
    (collection) => collection.active,
  );
  const enabledCampaigns = config.merchandising.campaigns.filter(
    (campaign) => campaign.active,
  );

  return (
    <AdminShell
      username={admin.username}
      title="Campaigns, collections & merchandising"
      subtitle="Control what customers see and how products are presented without moving price, promotion eligibility, stock or order authority out of CRM."
    >
      {publishing.hasDraftChanges ? (
        <AdminNotice tone="warning">
          Merchandising changes are in Draft. Customers will not see them until you publish.
        </AdminNotice>
      ) : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so product and stock health checks are temporarily incomplete.
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Merchandising health
          </p>
          <p className="mt-3 text-4xl font-semibold">{report.score}</p>
          <p className="mt-1 text-xs text-black/42">out of 100</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Active collections
          </p>
          <p className="mt-3 text-4xl font-semibold">{activeCollections.length}</p>
          <p className="mt-1 text-xs text-black/42">
            {config.merchandising.collections.length} total
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Campaigns
          </p>
          <p className="mt-3 text-4xl font-semibold">{enabledCampaigns.length}</p>
          <p className="mt-1 text-xs text-black/42">enabled schedules</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Health issues
          </p>
          <p className="mt-3 text-4xl font-semibold">
            {report.errors + report.warnings}
          </p>
          <p className="mt-1 text-xs text-black/42">
            {report.errors} errors · {report.warnings} warnings
          </p>
        </AdminCard>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          [
            "Collections",
            "Build curated landing pages, choose products and control ordering.",
            "/admin/merchandising/collections",
          ],
          [
            "Campaigns",
            "Schedule campaign creative, CTA, product targets and promotion-only presentation.",
            "/admin/merchandising/campaigns",
          ],
          [
            "Product merchandising",
            "Badges, browse priority, search ranking and per-product out-of-stock behavior.",
            "/admin/merchandising/products",
          ],
          [
            "Search & discovery",
            "Synonyms, category order, popular searches and discovery tuning.",
            "/admin/merchandising/discovery",
          ],
          [
            "Homepage",
            "Hero product, section ordering, collection/campaign placement and shop defaults.",
            "/admin/merchandising/homepage",
          ],
        ].map(([title, copy, href]) => (
          <Link key={href} href={href}>
            <AdminCard className="h-full transition hover:border-[#713a35]/20">
              <p className="text-base font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-6 text-black/48">{copy}</p>
            </AdminCard>
          </Link>
        ))}
      </div>

      <AdminCard className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Merchandising health checks</p>
            <p className="mt-1 text-xs leading-5 text-black/45">
              Detects missing CRM products, inactive products, out-of-stock targets, broken collection/campaign references, duplicate collection slugs, invalid schedules and promotion-only campaigns without a CRM sale.
            </p>
          </div>
          <Link
            href="/admin/publishing"
            className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
          >
            Open Publishing
          </Link>
        </div>

        {report.issues.length ? (
          <div className="mt-5 divide-y divide-black/7">
            {report.issues.slice(0, 50).map((issue) => (
              <Link
                key={issue.id}
                href={issue.href}
                className="grid gap-2 py-3 md:grid-cols-[110px_220px_1fr] md:items-center"
              >
                <span
                  className={
                    issue.severity === "error"
                      ? "w-fit rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-red-700"
                      : "w-fit rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-amber-700"
                  }
                >
                  {issue.severity}
                </span>
                <span className="text-sm font-medium">{issue.label}</span>
                <span className="text-sm text-black/50">{issue.message}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-emerald-700">
            No merchandising health issues detected in the current draft.
          </p>
        )}
      </AdminCard>
    </AdminShell>
  );
}
