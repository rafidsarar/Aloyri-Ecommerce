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
      title="Overview"
      subtitle="Manage your storefront, review customer operations and save website updates instantly."
    >
      {query.forbidden ? (
        <AdminNotice tone="warning">
          Your staff account does not have permission to open that Admin area.
        </AdminNotice>
      ) : null}
      {publishing.hasDraftChanges ? (
        <AdminNotice tone="warning">
          Changes are saved live. <Link href="/admin/history" className="font-semibold underline">Version history →</Link>
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
            Content updated
          </p>
          <p className="mt-3 text-3xl font-semibold">{editedProducts}</p>
          <p className="mt-1 text-xs text-black/45">Products with custom website content</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#713a35]/50">
            Low stock
          </p>
          <p className="mt-3 text-3xl font-semibold">{lowStock.length}</p>
          <p className="mt-1 text-xs text-black/45">Synced from CRM</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#713a35]/50">
            Out of stock
          </p>
          <p className="mt-3 text-3xl font-semibold">{outOfStock.length}</p>
          <p className="mt-1 text-xs text-black/45">Synced from CRM</p>
        </AdminCard>
      </div>

      <div className="mt-5 grid gap-5 ">
        <AdminCard>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold">Quick actions</p>
              <p className="mt-1 text-xs leading-5 text-black/60">Choose a task to get started.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ["Storefront Builder", "Edit homepage features, visual layouts, banners and content together", "/admin/builder", "homepage.view"],
                ["Product content", "Descriptions, badges, guidance and photography", "/admin/products", "products.view"],
                ["Customer pages", "About, shipping, returns, contact and FAQ", "/admin/pages", "pages.view"],
                ["Store settings", "Announcement, footer and support details", "/admin/settings", "settings.view"],
                ["Merchandising", "Campaigns, collections, badges and product ordering", "/admin/merchandising", "merchandising.view"],
                ["Analytics", "Conversion funnel, attribution and storefront intelligence", "/admin/analytics", "analytics.view"],
                ["SEO", "Search metadata, social previews, sitemap and redirects", "/admin/seo", "seo.view"],
                ["Version History", "Automatic live updates and restore", "/admin/history", "publishing.view"],
                ["Customer service", "Review support and return requests", "/admin/customer-service", "support.view"],
                ["Delivery", "Track shipments and delivery exceptions", "/admin/delivery", "analytics.view"],
                ["Operations", "Health checks and website configuration backups", "/admin/operations", "health.view"],
                ["Payments", "Review COD settlements and refunds", "/admin/payments", "analytics.view"],
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
