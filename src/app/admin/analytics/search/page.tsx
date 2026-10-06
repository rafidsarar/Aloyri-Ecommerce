import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
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
  const admin = await requireAdminPage();
  const query = await searchParams;
  const days = period(query.days);
  const report = await buildAnalyticsReport(days);

  return (
    <AdminShell
      username={admin.username}
      title="Search analytics"
      subtitle="Sanitized storefront search terms, engagement and conversion. Email-like text and long digit sequences are rejected before storage."
    >
      <AdminNotice tone="neutral">
        Search analytics never stores arbitrary checkout/customer free text. Only short sanitized storefront search phrases are eligible.
      </AdminNotice>

      <AdminCard className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3">Search term</th>
                <th className="pb-3">Searches</th>
                <th className="pb-3">Sessions</th>
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
                  <td className="py-4 pr-5">{row.sessions}</td>
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
