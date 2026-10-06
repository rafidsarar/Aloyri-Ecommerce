import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { buildAnalyticsReport } from "@/lib/analytics-store";

function period(value: string | undefined) {
  const days = Number(value);
  return [1, 7, 30, 90].includes(days) ? days : 30;
}

export default async function SearchAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPermission("analytics.view");
  const query = await searchParams;
  const days = period(query.days);
  const report = await buildAnalyticsReport(days);

  const totalSearches = report.searches.reduce(
    (sum, row) => sum + row.searches,
    0,
  );
  const measuredSearches = report.searches.reduce(
    (sum, row) => sum + row.resultSamples,
    0,
  );
  const zeroResultSearches = report.searches.reduce(
    (sum, row) => sum + row.zeroResultSearches,
    0,
  );
  const zeroResultRate = measuredSearches
    ? Math.round((zeroResultSearches / measuredSearches) * 1000) / 10
    : 0;
  const searchOrders = report.searches.reduce(
    (sum, row) => sum + row.orders,
    0,
  );

  return (
    <AdminShell
      username={admin.username}
      title="Search analytics"
      subtitle="Understand what customers search for, whether results were found, and which searches create product engagement and orders."
    >
      <AdminNotice tone="neutral">
        Search analytics stores only short sanitized storefront search phrases.
        Email-like text, long digit sequences and checkout/customer free text are
        rejected before storage.
      </AdminNotice>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <p className="text-xs font-medium uppercase tracking-[.13em] text-black/42">
            Searches
          </p>
          <p className="mt-2 text-3xl font-semibold">{totalSearches}</p>
          <p className="mt-1 text-xs text-black/45">Last {days} days</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-medium uppercase tracking-[.13em] text-black/42">
            Measured searches
          </p>
          <p className="mt-2 text-3xl font-semibold">{measuredSearches}</p>
          <p className="mt-1 text-xs text-black/45">
            Searches with a recorded result count
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-medium uppercase tracking-[.13em] text-black/42">
            Zero-result rate
          </p>
          <p className="mt-2 text-3xl font-semibold">{zeroResultRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-black/45">
            {zeroResultSearches} searches returned no products
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-medium uppercase tracking-[.13em] text-black/42">
            Search-attributed orders
          </p>
          <p className="mt-2 text-3xl font-semibold">{searchOrders}</p>
          <p className="mt-1 text-xs text-black/45">
            Orders retaining a search context
          </p>
        </AdminCard>
      </div>

      <AdminCard className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3">Search term</th>
                <th className="pb-3">Searches</th>
                <th className="pb-3">Avg. results</th>
                <th className="pb-3">Zero results</th>
                <th className="pb-3">Zero-result rate</th>
                <th className="pb-3">Product clicks</th>
                <th className="pb-3">Orders</th>
                <th className="pb-3">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {report.searches.map((row) => (
                <tr key={row.term}>
                  <td className="py-4 pr-5 font-semibold">{row.term}</td>
                  <td className="py-4 pr-5">{row.searches}</td>
                  <td className="py-4 pr-5">
                    {row.resultSamples ? row.averageResults.toFixed(1) : "—"}
                  </td>
                  <td className="py-4 pr-5">{row.zeroResultSearches}</td>
                  <td className="py-4 pr-5">
                    {row.resultSamples ? `${row.zeroResultRate.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-4 pr-5">{row.productClicks}</td>
                  <td className="py-4 pr-5">{row.orders}</td>
                  <td className="py-4">{row.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!report.searches.length ? (
          <p className="py-8 text-center text-sm text-black/45">
            No search analytics in this period yet.
          </p>
        ) : null}
      </AdminCard>
    </AdminShell>
  );
}
