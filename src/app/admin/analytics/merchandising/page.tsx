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

export default async function MerchandisingAnalyticsPage({
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
  const sectionNames = new Map(
    config.merchandising.homepageSections.map((section) => [
      section.id,
      section.title || section.eyebrow || section.kind,
    ]),
  );
  sectionNames.set("homepage-hero", "Homepage hero");

  return (
    <AdminShell
      username={admin.username}
      title="Homepage merchandising analytics"
      subtitle="Compare hero, bestseller, featured, new-arrival, collection and campaign placements by engagement and CRM-confirmed conversion."
    >
      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3">Placement</th>
                <th className="pb-3">Type</th>
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
              {report.placements.map((row) => (
                <tr key={row.placementId}>
                  <td className="py-4 pr-5">
                    <p className="font-semibold">
                      {sectionNames.get(row.placementId) || row.placementId}
                    </p>
                    <p className="mt-1 text-xs text-black/38">{row.placementId}</p>
                  </td>
                  <td className="py-4 pr-5 capitalize">{row.placementKind}</td>
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
        {!report.placements.length ? (
          <p className="py-8 text-center text-sm text-black/45">
            No homepage placement analytics in this period yet.
          </p>
        ) : null}
      </AdminCard>
    </AdminShell>
  );
}
