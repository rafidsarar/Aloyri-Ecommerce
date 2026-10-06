import Link from "next/link";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import {
  hasAdminPermission,
  requireAdminPermission,
  type AdminPermission,
} from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  getPublishingStatus,
  readDraftStorefrontConfig,
} from "@/lib/storefront-admin-store";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string }>;
}) {
  const admin = await requireAdminPermission("dashboard.view");
  const query = await searchParams;
  const [config, catalog, publishing] = await Promise.all([
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
    getPublishingStatus(),
  ]);

  const liveProducts = catalog.ok ? catalog.body.products : [];
  const lowStock = liveProducts.filter(
    (product) => product.availableStock > 0 && product.availableStock <= 5,
  );
  const outOfStock = liveProducts.filter(
    (product) => product.availableStock <= 0,
  );
  const editedProducts = Object.keys(config.products).length;

  return (
    <AdminShell
      username={admin.username}
      title="Storefront overview"
      subtitle="Run Aloyri Ecommerce independently while CRM stays responsible only for live price, stock and order operations."
    >
      {query.forbidden ? (
        <AdminNotice tone="warning">
          Your staff account does not have permission to open that Admin area.
        </AdminNotice>
      ) : null}
      {publishing.hasDraftChanges ? (
        <AdminNotice tone="warning">
          You have unpublished website changes. Review them in Publishing before customers can see them.
        </AdminNotice>
      ) : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is temporarily unavailable. Website content management is
          still available, but price and stock cannot be shown here until the
          integration recovers.
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#713a35]/50">
            Live products
          </p>
          <p className="mt-3 text-3xl font-semibold">{liveProducts.length}</p>
          <p className="mt-1 text-xs text-black/45">Synced from CRM</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#713a35]/50">
            Website-edited products
          </p>
          <p className="mt-3 text-3xl font-semibold">{editedProducts}</p>
          <p className="mt-1 text-xs text-black/45">Editorial data owned here</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#713a35]/50">
            Low stock
          </p>
          <p className="mt-3 text-3xl font-semibold">{lowStock.length}</p>
          <p className="mt-1 text-xs text-black/45">Read-only CRM signal</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#713a35]/50">
            Out of stock
          </p>
          <p className="mt-3 text-3xl font-semibold">{outOfStock.length}</p>
          <p className="mt-1 text-xs text-black/45">Read-only CRM signal</p>
        </AdminCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <AdminCard>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold">Website operations</p>
              <p className="mt-1 text-xs leading-5 text-black/45">
                These areas are now owned by Ecommerce Admin rather than CRM.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-700">
              Separate
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["Homepage", "Hero, featured content and campaign copy", "/admin/homepage", "homepage.view"],
                ["Product content", "Descriptions, badges, guidance and photography", "/admin/products", "products.view"],
                ["Customer pages", "About, shipping, returns, contact and FAQ", "/admin/pages", "pages.view"],
                ["Store settings", "Announcement, footer and support details", "/admin/settings", "settings.view"],
                ["Merchandising", "Campaigns, collections, badges and product ordering", "/admin/merchandising", "merchandising.view"],
                ["Analytics", "Conversion funnel, attribution and storefront intelligence", "/admin/analytics", "analytics.view"],
                ["SEO", "Search metadata, social previews, sitemap and redirects", "/admin/seo", "seo.view"],
                ["Publishing", "Preview, publish, restore and version history", "/admin/publishing", "publishing.view"],
                ["Team access", "Staff roles, permissions and session revocation", "/admin/staff", "staff.view"],
                ["Audit history", "Who changed what and when", "/admin/audit", "audit.view"],
                ["Operations", "Health checks and website configuration backups", "/admin/operations", "health.view"],
                ["Security", "Password, recovery codes and session control", "/admin/security", "security.self"],
              ] satisfies Array<[string, string, string, AdminPermission]>
            )
              .filter(([, , , permission]) =>
                hasAdminPermission(admin, permission),
              )
              .map(([title, copy, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl border border-black/8 bg-[#fffaf7] p-4 transition hover:border-[#713a35]/20"
                >
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-black/45">{copy}</p>
                </Link>
              ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">CRM boundary</p>
          <div className="mt-4 grid gap-3">
            {[
              ["Product price", "CRM", "Locked here"],
              ["Available stock", "CRM", "Locked here"],
              ["Order creation", "CRM", "Signed handoff"],
              ["Order status", "CRM", "Customer-safe sync"],
              ["Website copy & media", "Ecommerce", "Editable here"],
            ].map(([label, owner, state]) => (
              <div
                key={label}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-black/6 pb-3 text-sm last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="mt-0.5 text-xs text-black/40">{state}</p>
                </div>
                <span className="self-center rounded-full bg-[#f2e8e4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#713a35]">
                  {owner}
                </span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {lowStock.length ? (
        <AdminCard className="mt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Low-stock visibility</p>
              <p className="mt-1 text-xs text-black/45">
                For awareness only. Replenishment stays in CRM.
              </p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-black/6">
            {lowStock.slice(0, 8).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {product.brand} · {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-black/40">{product.id}</p>
                </div>
                <span className="font-semibold">{product.availableStock} left</span>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}
    </AdminShell>
  );
}
