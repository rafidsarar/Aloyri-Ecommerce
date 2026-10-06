import Link from "next/link";
import { saveDiscoveryMerchandising } from "@/app/admin/merchandising/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  getPublishingStatus,
  readDraftStorefrontConfig,
} from "@/lib/storefront-admin-store";

export default async function DiscoveryMerchandisingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireAdminPermission("merchandising.view");
  const [query, config, publishing] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
    getPublishingStatus(),
  ]);
  const discovery = config.merchandising.discovery;

  return (
    <AdminShell
      username={admin.username}
      title="Search & discovery controls"
      subtitle="Manage storefront search synonyms, category ordering and popular search shortcuts. Product-level search boosts stay under Product merchandising."
    >
      {query.saved ? (
        <AdminNotice>Search & discovery draft saved.</AdminNotice>
      ) : null}
      {publishing.hasDraftChanges ? (
        <AdminNotice tone="warning">
          These controls are in Draft. Customers will not see them until the
          storefront draft is published.
        </AdminNotice>
      ) : null}

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Link href="/admin/merchandising/products">
          <AdminCard className="h-full transition hover:border-[#713a35]/20">
            <p className="font-semibold">Product search ranking</p>
            <p className="mt-2 text-sm leading-6 text-black/48">
              Boost, demote or hide individual products from search while
              leaving CRM price, stock and product status untouched.
            </p>
          </AdminCard>
        </Link>
        <Link href="/admin/analytics/search">
          <AdminCard className="h-full transition hover:border-[#713a35]/20">
            <p className="font-semibold">Search analytics</p>
            <p className="mt-2 text-sm leading-6 text-black/48">
              Review search demand, average result counts, true zero-result
              searches, product engagement and attributed orders.
            </p>
          </AdminCard>
        </Link>
      </div>

      <form action={saveDiscoveryMerchandising} className="grid gap-5">
        <AdminCard>
          <label className="block">
            <span className="text-sm font-semibold">Synonym groups</span>
            <span className="mt-1 block text-xs leading-5 text-black/45">
              One group per line, comma-separated. Equivalent terms can match
              the same products. Example: sunscreen, sunblock, spf
            </span>
            <textarea
              name="synonymGroups"
              rows={9}
              defaultValue={discovery.synonymGroups
                .map((group) => group.join(", "))
                .join("\n")}
              className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-[#713a35]/35"
            />
          </label>
        </AdminCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <AdminCard>
            <label className="block">
              <span className="text-sm font-semibold">Category order</span>
              <span className="mt-1 block text-xs leading-5 text-black/45">
                One category per line. Categories not listed here are appended
                alphabetically, so new CRM categories remain discoverable.
              </span>
              <textarea
                name="categoryOrder"
                rows={10}
                defaultValue={discovery.categoryOrder.join("\n")}
                className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-[#713a35]/35"
              />
            </label>
          </AdminCard>

          <AdminCard>
            <label className="block">
              <span className="text-sm font-semibold">Popular searches</span>
              <span className="mt-1 block text-xs leading-5 text-black/45">
                One phrase per line. Up to eight shortcuts are shown on the shop
                when the customer has not entered a query.
              </span>
              <textarea
                name="popularSearches"
                rows={10}
                defaultValue={discovery.popularSearches.join("\n")}
                className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-[#713a35]/35"
              />
            </label>
          </AdminCard>
        </div>

        <AdminNotice tone="neutral">
          Discovery settings affect only the ecommerce storefront. They do not
          edit CRM products, selling price, stock, orders, customers or finance.
        </AdminNotice>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save discovery draft
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
