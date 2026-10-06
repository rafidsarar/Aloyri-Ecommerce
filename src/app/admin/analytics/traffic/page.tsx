import {
  AdminCard,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { buildAnalyticsReport } from "@/lib/analytics-store";

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

export default async function TrafficAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPermission("analytics.view");
  const query = await searchParams;
  const days = period(query.days);
  const report = await buildAnalyticsReport(days);

  return (
    <AdminShell
      username={admin.username}
      title="Traffic & device performance"
      subtitle="First-party source/medium attribution and coarse device-class conversion. No IP address or user-agent string is stored."
    >
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <AdminCard>
          <p className="text-sm font-semibold">Traffic sources</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Medium</th>
                  <th className="pb-3">Sessions</th>
                  <th className="pb-3">Orders</th>
                  <th className="pb-3">Conversion</th>
                  <th className="pb-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {report.sources.map((row) => (
                  <tr key={row.source + "|" + row.medium}>
                    <td className="py-4 pr-5 font-semibold">{row.source}</td>
                    <td className="py-4 pr-5">{row.medium}</td>
                    <td className="py-4 pr-5">{row.sessions}</td>
                    <td className="py-4 pr-5">{row.orders}</td>
                    <td className="py-4 pr-5">{row.conversionRate.toFixed(1)}%</td>
                    <td className="py-4">{money(row.revenueBdt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Device classes</p>
          <div className="mt-4 divide-y divide-black/7">
            {report.devices.map((row) => (
              <div key={row.device} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3 text-sm">
                <span className="font-medium capitalize">{row.device}</span>
                <span>{row.sessions} sessions</span>
                <span className="text-xs text-black/45">
                  {row.conversionRate.toFixed(1)}% conversion
                </span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
