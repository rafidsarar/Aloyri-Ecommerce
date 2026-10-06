import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { buildAnalyticsReport } from "@/lib/analytics-store";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";

function period(value: string | undefined) {
  const days = Number(value);
  return [1, 7, 30, 90].includes(days) ? days : 30;
}

function money(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

function sourceId(placementId: string) {
  return placementId.replace(/^rec-(?:related|routine)-/, "");
}

export default async function RecommendationAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPermission("analytics.view");
  const query = await searchParams;
  const days = period(query.days);
  const [report, catalog] = await Promise.all([
    buildAnalyticsReport(days),
    fetchCrmCatalog(),
  ]);
  const names = new Map<string, string>(
    catalog.ok
      ? catalog.body.products.map(
          (product) =>
            [product.id, product.brand + " · " + product.name] as const,
        )
      : [],
  );
  const rows = report.placements.filter((row) =>
    row.placementKind.startsWith("recommendation-"),
  );
  const totals = rows.reduce(
    (sum, row) => ({
      impressions: sum.impressions + row.impressions,
      clicks: sum.clicks + row.clicks,
      orders: sum.orders + row.orders,
      revenue: sum.revenue + row.revenueBdt,
    }),
    { impressions: 0, clicks: 0, orders: 0, revenue: 0 },
  );
  const ctr = totals.impressions
    ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
    : 0;

  return (
    <AdminShell
      username={admin.username}
      title="Recommendation conversion"
      subtitle="Measure recommendation impressions, product clicks and CRM-confirmed order attribution for related-product and complete-the-routine placements."
    >
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog names are unavailable, so source products are shown by placement ID.
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Impressions</p>
          <p className="mt-2 text-3xl font-semibold">{totals.impressions}</p>
          <p className="mt-1 text-xs text-black/42">Last {days} days</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Clicks</p>
          <p className="mt-2 text-3xl font-semibold">{totals.clicks}</p>
          <p className="mt-1 text-xs text-black/42">{ctr.toFixed(2)}% click-through</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Attributed orders</p>
          <p className="mt-2 text-3xl font-semibold">{totals.orders}</p>
          <p className="mt-1 text-xs text-black/42">CRM-confirmed conversions</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Attributed revenue</p>
          <p className="mt-2 text-3xl font-semibold">{money(totals.revenue)}</p>
          <p className="mt-1 text-xs text-black/42">Confirmed website orders</p>
        </AdminCard>
      </div>

      <AdminCard className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3">Source product</th>
                <th className="pb-3">Placement</th>
                <th className="pb-3">Impressions</th>
                <th className="pb-3">Clicks</th>
                <th className="pb-3">CTR</th>
                <th className="pb-3">Sessions</th>
                <th className="pb-3">Orders</th>
                <th className="pb-3">Revenue</th>
                <th className="pb-3">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {rows.map((row) => {
                const id = sourceId(row.placementId);
                return (
                  <tr key={row.placementId}>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{names.get(id) || id}</p>
                      <p className="mt-1 text-xs text-black/38">{row.placementId}</p>
                    </td>
                    <td className="py-4 pr-5">
                      {row.placementKind === "recommendation-routine"
                        ? "Complete routine"
                        : "Related products"}
                    </td>
                    <td className="py-4 pr-5">{row.impressions}</td>
                    <td className="py-4 pr-5">{row.clicks}</td>
                    <td className="py-4 pr-5">{row.clickThroughRate.toFixed(1)}%</td>
                    <td className="py-4 pr-5">{row.sessions}</td>
                    <td className="py-4 pr-5">{row.orders}</td>
                    <td className="py-4 pr-5">{money(row.revenueBdt)}</td>
                    <td className="py-4">{row.conversionRate.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-black/45">
            No recommendation placement activity in this period yet.
          </p>
        ) : null}
      </AdminCard>
    </AdminShell>
  );
}
