import {
  AdminCard,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { buildAnalyticsReport } from "@/lib/analytics-store";
import { readPublishedStorefrontConfig } from "@/lib/storefront-admin-store";

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

export default async function CampaignAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPage();
  const query = await searchParams;
  const days = period(query.days);
  const [report, config] = await Promise.all([
    buildAnalyticsReport(days),
    readPublishedStorefrontConfig(),
  ]);
  const names = new Map(
    config.merchandising.campaigns.map((campaign) => [
      campaign.id,
      campaign.title,
    ]),
  );

  return (
    <AdminShell
      username={admin.username}
      title="Campaign analytics"
      subtitle="Campaign impressions, clicks and CRM-confirmed attributed orders and revenue."
    >
      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3">Campaign</th>
                <th className="pb-3">Impressions</th>
                <th className="pb-3">Clicks</th>
                <th className="pb-3">CTR</th>
                <th className="pb-3">Sessions</th>
                <th className="pb-3">Orders</th>
                <th className="pb-3">Conversion</th>
                <th className="pb-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {report.campaigns.map((row) => (
                <tr key={row.campaignId}>
                  <td className="py-4 pr-5">
                    <p className="font-semibold">
                      {names.get(row.campaignId) || row.campaignId}
                    </p>
                    <p className="mt-1 text-xs text-black/38">{row.campaignId}</p>
                  </td>
                  <td className="py-4 pr-5">{row.impressions}</td>
                  <td className="py-4 pr-5">{row.clicks}</td>
                  <td className="py-4 pr-5">{row.clickThroughRate.toFixed(1)}%</td>
                  <td className="py-4 pr-5">{row.sessions}</td>
                  <td className="py-4 pr-5">{row.orders}</td>
                  <td className="py-4 pr-5">{row.conversionRate.toFixed(1)}%</td>
                  <td className="py-4">{money(row.revenueBdt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!report.campaigns.length ? (
          <p className="py-8 text-center text-sm text-black/45">
            No campaign analytics in this period yet.
          </p>
        ) : null}
      </AdminCard>
    </AdminShell>
  );
}
