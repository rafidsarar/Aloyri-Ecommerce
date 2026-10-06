import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  effectiveSeoEntry,
  productSeoFallback,
} from "@/lib/seo-manager";
import {
  applyStorefrontEditorial,
  readDraftStorefrontConfig,
} from "@/lib/storefront-admin-store";

export default async function SeoProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdminPermission("seo.view");
  const [query, config, catalog] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);

  const products = catalog.ok
    ? applyStorefrontEditorial(catalog.body.products, config)
    : [];

  return (
    <AdminShell
      username={admin.username}
      title="Product SEO"
      subtitle="Control product search metadata independently from CRM. Product identity, price and stock remain CRM-owned."
    >
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          Product SEO editing is paused because the live CRM catalog is unavailable.
        </AdminNotice>
      ) : null}

      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">SEO title</th>
                <th className="pb-3 font-semibold">Indexing</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {products.map((product) => {
                const custom = config.seo.products[product.id];
                const effective = effectiveSeoEntry(
                  custom,
                  productSeoFallback(product),
                );
                return (
                  <tr key={product.id}>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{product.name}</p>
                      <p className="mt-1 text-xs text-black/42">
                        {product.brand} · {product.id}
                      </p>
                    </td>
                    <td className="max-w-[320px] py-4 pr-5">
                      <p className="truncate">{effective.title}</p>
                      <p className="mt-1 truncate text-xs text-black/38">
                        {effective.canonical}
                      </p>
                    </td>
                    <td className="py-4 pr-5">
                      <span
                        className={
                          effective.index === false
                            ? "rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-black/50"
                            : "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-emerald-700"
                        }
                      >
                        {effective.index === false ? "noindex" : "index"}
                      </span>
                    </td>
                    <td className="py-4 pr-5">
                      <span
                        className={
                          custom
                            ? "rounded-full bg-[#f2e8e4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#713a35]"
                            : "rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-black/45"
                        }
                      >
                        {custom ? "Customized" : "Smart default"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        href={"/admin/seo/products/" + encodeURIComponent(product.id)}
                        className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
                      >
                        Edit SEO
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
