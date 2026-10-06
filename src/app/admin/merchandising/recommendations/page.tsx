import {
  saveRecommendationMerchandising,
} from "@/app/admin/merchandising/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function RecommendationMerchandisingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireAdminPermission("merchandising.view");
  const [query, config, catalog] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);
  const products = catalog.ok ? catalog.body.products : [];
  const recommendation = config.merchandising.recommendations;

  return (
    <AdminShell
      username={admin.username}
      title="Product recommendations"
      subtitle="Control related products, complete-the-routine relationships and recommendation priority. All recommendation logic stays in Ecommerce; CRM price, stock and orders remain authoritative."
    >
      {query.saved ? (
        <AdminNotice>Recommendation merchandising draft saved.</AdminNotice>
      ) : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so recommendation relationships cannot be edited safely right now.
        </AdminNotice>
      ) : null}

      <form action={saveRecommendationMerchandising} className="grid gap-5">
        <input
          type="hidden"
          name="catalogIds"
          value={products.map((product) => product.id).join("\n")}
        />

        <AdminCard>
          <div className="grid gap-5 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium">
              Recommendation engine
              <span className="flex items-center gap-2 rounded-xl border border-black/8 px-3 py-3">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={recommendation.enabled}
                />
                <span>Enabled</span>
              </span>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Automatic fallback
              <select
                name="fallbackMode"
                defaultValue={recommendation.fallbackMode}
                className="rounded-xl border border-black/10 px-3 py-3"
              >
                <option value="category-and-routine">Related + routine</option>
                <option value="category">Related only</option>
                <option value="off">Manual relationships only</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Max related products
              <input
                type="number"
                name="maxRelated"
                min={1}
                max={6}
                defaultValue={recommendation.maxRelated}
                className="rounded-xl border border-black/10 px-3 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Max routine products
              <input
                type="number"
                name="maxRoutine"
                min={1}
                max={6}
                defaultValue={recommendation.maxRoutine}
                className="rounded-xl border border-black/10 px-3 py-3"
              />
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-5">
            <p className="font-semibold">Product-to-product relationships</p>
            <p className="mt-1 text-xs leading-5 text-black/45">
              Use one CRM product ID per line. Manual order is preserved. Recommendation boost affects automatic fallback ranking only. Hidden products are excluded from every recommendation placement.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Related product IDs</th>
                  <th className="pb-3">Complete-routine IDs</th>
                  <th className="pb-3">Fallback boost</th>
                  <th className="pb-3">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {products.map((product) => {
                  const rule = recommendation.rules[product.id];
                  return (
                    <tr key={product.id}>
                      <td className="py-4 pr-5 align-top">
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-1 text-xs text-black/42">
                          {product.brand} · {product.id}
                        </p>
                        <p className="mt-1 text-[10px] text-black/35">
                          {product.category} · stock {product.availableStock}
                        </p>
                      </td>
                      <td className="py-4 pr-5 align-top">
                        <textarea
                          name={"related_" + product.id}
                          rows={4}
                          defaultValue={(rule?.relatedProductIds || []).join("\n")}
                          placeholder="product-id"
                          className="w-full min-w-64 rounded-lg border border-black/10 px-3 py-2 text-xs"
                        />
                      </td>
                      <td className="py-4 pr-5 align-top">
                        <textarea
                          name={"routine_" + product.id}
                          rows={4}
                          defaultValue={(rule?.routineProductIds || []).join("\n")}
                          placeholder="product-id"
                          className="w-full min-w-64 rounded-lg border border-black/10 px-3 py-2 text-xs"
                        />
                      </td>
                      <td className="py-4 pr-5 align-top">
                        <input
                          type="number"
                          name={"boost_" + product.id}
                          min={-100}
                          max={100}
                          defaultValue={rule?.boost || 0}
                          className="w-24 rounded-lg border border-black/10 px-3 py-2"
                        />
                        <p className="mt-1 text-[10px] text-black/38">
                          -100 to +100
                        </p>
                      </td>
                      <td className="py-4 align-top">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name={"hidden_" + product.id}
                            defaultChecked={Boolean(rule?.hidden)}
                          />
                          <span className="text-xs font-medium">
                            Hide from recommendations
                          </span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminNotice tone="neutral">
          Recommendation relationships change only website presentation. They do not alter CRM products, stock, selling price, customers, orders, returns or finance. Out-of-stock products are automatically excluded from recommendation placements.
        </AdminNotice>

        <div className="flex justify-end">
          <button
            disabled={!catalog.ok}
            className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Save recommendation draft
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
