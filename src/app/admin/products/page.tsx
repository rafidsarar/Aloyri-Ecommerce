import Link from "next/link";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { formatPrice } from "@/lib/catalog";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdminPage();
  const [{ error }, config, catalog] = await Promise.all([
    searchParams,
    readStorefrontConfig(),
    fetchCrmCatalog(),
  ]);

  const products = catalog.ok ? catalog.body.products : [];

  return (
    <AdminShell
      username={admin.username}
      title="Product presentation"
      subtitle="Edit website descriptions, routine guidance, badges and photography. CRM-owned price and stock are visible but locked."
    >
      {error ? <AdminNotice tone="warning">{error}</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so product editing is paused to prevent editing against stale product identity.
        </AdminNotice>
      ) : null}

      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Price</th>
                <th className="pb-3 font-semibold">Stock</th>
                <th className="pb-3 font-semibold">Website content</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {products.map((product) => {
                const editorial = config.products[product.id];
                return (
                  <tr key={product.id}>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{product.name}</p>
                      <p className="mt-1 text-xs text-black/42">
                        {product.brand} · {product.size} · {product.id}
                      </p>
                    </td>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{formatPrice(product.salePrice ?? product.price)}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-black/38">CRM locked</p>
                    </td>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{product.availableStock}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-black/38">CRM locked</p>
                    </td>
                    <td className="py-4 pr-5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] ${editorial ? "bg-emerald-50 text-emerald-700" : "bg-black/5 text-black/45"}`}>
                        {editorial ? "Customized" : "Default"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        href={`/admin/products/${encodeURIComponent(product.id)}`}
                        className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
                      >
                        Edit website content
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
