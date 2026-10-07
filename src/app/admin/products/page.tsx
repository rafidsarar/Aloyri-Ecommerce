import Link from "next/link";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { formatPrice } from "@/lib/catalog";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const admin = await requireAdminPermission("products.view");
  const [{ error, q = "" }, config, catalog] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);

  const query = q.trim().slice(0, 100);
  const products = catalog.ok ? catalog.body.products.filter(product => `${product.name} ${product.brand} ${product.size} ${product.id}`.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <AdminShell
      username={admin.username}
      title="Products"
      subtitle="Edit product descriptions and photos. Price and stock stay synced from CRM."
    >
      {error ? <AdminNotice tone="warning">{error}</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so product editing is paused to prevent editing against stale product identity.
        </AdminNotice>
      ) : null}

      <AdminCard>
        <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
          <label className="grid flex-1 gap-1.5 text-sm font-medium">Find a product<input type="search" name="q" defaultValue={query} placeholder="Search name, brand or product ID" className="w-full border px-3 py-2.5" /></label>
          <button className="rounded-lg border border-black/15 px-4 py-2.5 text-sm">Search</button>
          {query ? <Link href="/admin/products" className="px-2 py-2.5 text-sm underline">Clear</Link> : null}
        </form>
        <p className="mb-3 text-xs text-black/60">{products.length} products{query ? ` matching “${query}”` : ""}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
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
              {!products.length ? <tr><td colSpan={5} className="py-10 text-center text-black/60">{catalog.ok ? "No products match your search." : "Products will appear when the catalog is available."}</td></tr> : null}
              {products.map((product) => {
                const editorial = config.products[product.id];
                return (
                  <tr key={product.id}>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{product.name}</p>
                      <p className="mt-1 text-xs text-black/42">
                        {product.brand} · {product.size}
                      </p>
                    </td>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{formatPrice(product.salePrice ?? product.price)}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-black/38">CRM</p>
                    </td>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{product.availableStock}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-black/38">CRM</p>
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
                        Edit content
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
