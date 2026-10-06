import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { saveRedirects } from "@/app/admin/seo/actions";
import { requireAdminPermission } from "@/lib/admin-auth";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function SeoRedirectsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("seo.view");
  const [query, config] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
  ]);

  const rows = [
    ...config.seo.redirects,
    {
      id: "",
      from: "",
      to: "",
      permanent: true,
      active: true,
    },
  ].slice(0, 200);

  return (
    <AdminShell
      username={admin.username}
      title="Redirect manager"
      subtitle="Manage versioned website redirects in Draft. Protected admin, checkout, cart, tracking and API routes cannot be used as redirect sources."
    >
      {query.saved ? <AdminNotice>Redirect draft saved.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <form action={saveRedirects} className="grid gap-5">
        <input type="hidden" name="count" value={rows.length} />

        {rows.map((row, index) => (
          <AdminCard key={row.id || "new"}>
            <input type="hidden" name={"id_" + index} value={row.id} />
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_150px_120px] lg:items-end">
              <label className="grid gap-1.5 text-sm font-medium">
                Source path
                <input
                  name={"from_" + index}
                  defaultValue={row.from}
                  placeholder="/old-product-url"
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Destination path
                <input
                  name={"to_" + index}
                  defaultValue={row.to}
                  placeholder="/product/new-url"
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Type
                <select
                  name={"permanent_" + index}
                  defaultValue={row.permanent ? "on" : "off"}
                  className="rounded-xl border border-black/10 px-4 py-3"
                >
                  <option value="on">308 Permanent</option>
                  <option value="off">307 Temporary</option>
                </select>
              </label>
              <div className="grid gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name={"active_" + index}
                    defaultChecked={row.active}
                  />
                  Active
                </label>
                {row.id ? (
                  <label className="flex items-center gap-2 text-sm text-red-700">
                    <input type="checkbox" name={"remove_" + index} />
                    Remove
                  </label>
                ) : null}
              </div>
            </div>
          </AdminCard>
        ))}

        <AdminNotice tone="neutral">
          Redirects preserve the visitor&apos;s query string when the destination does not define one. Redirect changes become live only after Publishing.
        </AdminNotice>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save redirect draft
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
