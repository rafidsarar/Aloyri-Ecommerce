import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { buildAnalyticsReport } from "@/lib/analytics-store";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";

function period(value: string | undefined) {
  const days = Number(value);
  return [1, 7, 30, 90].includes(days) ? days : 30;
}

export default async function ProductAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPage();
  const query = await searchParams;
  const days = period(query.days);
  const [report, catalog] = await Promise.all([
    buildAnalyticsReport(days),
    fetchCrmCatalog(),
  ]);
  const names = new Map(
    catalog.ok
      ? catalog.body.products.map((product) => [
          product.id,
          product.brand + " · " + product.name,
        ])
      : [],
  );

  return (
    <AdminShell
      username={admin.username}
      title="Product conversion"
      subtitle="Product views, clicks, add-to-cart activity and CRM-confirmed order conversion."
    >
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog names are unavailable, so products are shown by ID only.
        </AdminNotice>
      ) : null}

      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3">Product</th>
                <th className="pb-3">Views</th>
                <th className="pb-3">Clicks</th>
                <th className="pb-3">Add to cart</th>
                <th className="pb-3">Order sessions</th>
                <th className="pb-3">Units ordered</th>
                <th className="pb-3">View → cart</th>
                <th className="pb-3">Cart → order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {report.products.map((row) => (
                <tr key={row.productId}>
                  <td className="py-4 pr-5">
                    <p className="font-semibold">
                      {names.get(row.productId) || row.productId}
                    </p>
                    <p className="mt-1 text-xs text-black/38">{row.productId}</p>
                  </td>
                  <td className="py-4 pr-5">{row.views}</td>
                  <td className="py-4 pr-5">{row.clicks}</td>
                  <td className="py-4 pr-5">{row.addToCarts}</td>
                  <td className="py-4 pr-5">{row.orderSessions}</td>
                  <td className="py-4 pr-5">{row.unitsOrdered}</td>
                  <td className="py-4 pr-5">{row.viewToCartRate.toFixed(1)}%</td>
                  <td className="py-4">{row.cartToOrderRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!report.products.length ? (
          <p className="py-8 text-center text-sm text-black/45">
            No product analytics in this period yet.
          </p>
        ) : null}
      </AdminCard>
    </AdminShell>
  );
}
