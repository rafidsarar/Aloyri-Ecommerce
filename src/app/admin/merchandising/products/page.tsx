import {
  saveProductMerchandising,
} from "@/app/admin/merchandising/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/catalog";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

const badges = ["", "New", "Bestseller", "Limited", "Staff Pick", "Trending"];

export default async function ProductMerchandisingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireAdminPage();
  const [query, config, catalog] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);
  const products = catalog.ok ? catalog.body.products : [];

  return (
    <AdminShell
      username={admin.username}
      title="Product merchandising"
      subtitle="Set website badges, merchandising priority and out-of-stock presentation. CRM selling price, promotion price and stock remain read-only."
    >
      {query.saved ? <AdminNotice>Product merchandising draft saved.</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so product merchandising cannot be edited safely right now.
        </AdminNotice>
      ) : null}

      <form action={saveProductMerchandising} className="grid gap-5">
        <input
          type="hidden"
          name="catalogIds"
          value={products.map((product) => product.id).join("\n")}
        />

        <AdminCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                  <th className="pb-3 font-semibold">Product</th>
                  <th className="pb-3 font-semibold">CRM commerce</th>
                  <th className="pb-3 font-semibold">Website badge</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Out of stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {products.map((product) => {
                  const rule = config.merchandising.productRules[product.id];
                  const saleActive =
                    Number.isFinite(product.salePrice) &&
                    Number(product.salePrice) > 0 &&
                    Number(product.salePrice) < product.price;

                  return (
                    <tr key={product.id}>
                      <td className="py-4 pr-5">
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-1 text-xs text-black/42">
                          {product.brand} · {product.id}
                        </p>
                      </td>
                      <td className="py-4 pr-5">
                        <p className="font-semibold">
                          {formatPrice(product.salePrice ?? product.price)}
                        </p>
                        <p className="mt-1 text-xs text-black/42">
                          stock {product.availableStock}
                          {saleActive ? " · CRM sale active" : ""}
                        </p>
                      </td>
                      <td className="py-4 pr-5">
                        <select
                          name={"badge_" + product.id}
                          defaultValue={rule?.badge || ""}
                          className="w-full rounded-lg border border-black/10 px-3 py-2"
                        >
                          {badges.map((badge) => (
                            <option key={badge || "none"} value={badge}>
                              {badge || "No website badge"}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[10px] text-black/38">
                          CRM sale badge always takes precedence.
                        </p>
                      </td>
                      <td className="py-4 pr-5">
                        <input
                          type="number"
                          name={"priority_" + product.id}
                          defaultValue={rule?.priority || 0}
                          min={-1000}
                          max={1000}
                          className="w-28 rounded-lg border border-black/10 px-3 py-2"
                        />
                        <p className="mt-1 text-[10px] text-black/38">
                          Higher appears earlier.
                        </p>
                      </td>
                      <td className="py-4">
                        <select
                          name={"outOfStock_" + product.id}
                          defaultValue={rule?.outOfStockMode || "inherit"}
                          className="w-full rounded-lg border border-black/10 px-3 py-2"
                        >
                          <option value="inherit">Use global rule</option>
                          <option value="keep">Keep position</option>
                          <option value="push-down">Push down</option>
                          <option value="hide">Hide</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminNotice tone="neutral">
          Website badges such as New, Trending or Staff Pick do not change selling price. When CRM supplies a valid sale price/promotion badge, that CRM promotion is displayed first.
        </AdminNotice>

        <div className="flex justify-end">
          <button
            disabled={!catalog.ok}
            className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Save product merchandising draft
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
