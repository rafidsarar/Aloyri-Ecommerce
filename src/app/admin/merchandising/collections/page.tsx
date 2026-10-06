import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const admin = await requireAdminPage();
  const [query, config] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
  ]);

  return (
    <AdminShell
      username={admin.username}
      title="Collections"
      subtitle="Create curated product groups and landing pages. Product order is website-owned; live price and stock still come from CRM."
    >
      {query.deleted ? <AdminNotice>Collection removed from Draft.</AdminNotice> : null}

      <div className="mb-5 flex justify-end">
        <Link
          href="/admin/merchandising/collections/new"
          className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
        >
          New collection
        </Link>
      </div>

      <AdminCard>
        {config.merchandising.collections.length ? (
          <div className="divide-y divide-black/7">
            {config.merchandising.collections.map((collection) => (
              <div
                key={collection.id}
                className="grid gap-4 py-4 md:grid-cols-[1fr_120px_120px_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{collection.title}</p>
                  <p className="mt-1 text-xs text-black/42">
                    /collections/{collection.slug} · {collection.productIds.length} products
                  </p>
                </div>
                <span
                  className={
                    collection.active
                      ? "w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-emerald-700"
                      : "w-fit rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-black/45"
                  }
                >
                  {collection.active ? "Active" : "Hidden"}
                </span>
                <span className="text-xs text-black/45">
                  {collection.outOfStockMode === "inherit"
                    ? "OOS: inherit"
                    : "OOS: " + collection.outOfStockMode}
                </span>
                <Link
                  href={"/admin/merchandising/collections/" + collection.id}
                  className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold">No collections yet.</p>
            <p className="mt-2 text-xs text-black/45">
              Create the first collection to build curated storefront landing pages.
            </p>
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
