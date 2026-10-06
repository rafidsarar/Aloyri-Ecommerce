import {
  AdminCard,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { buildAnalyticsReport } from "@/lib/analytics-store";

function period(value: string | undefined) {
  const days = Number(value);
  return [1, 7, 30, 90].includes(days) ? days : 30;
}

export default async function FunnelAnalyticsPage({
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
      title="Conversion funnel"
      subtitle="Unique anonymous sessions progressing from storefront visit through CRM-confirmed order."
    >
      <div className="grid gap-4">
        {report.funnel.map((stage, index) => (
          <AdminCard key={stage.stage}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold">
                  {index + 1}. {stage.stage}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-[#713a35]"
                    style={{ width: Math.max(2, stage.rateFromVisit) + "%" }}
                  />
                </div>
              </div>
              <span className="text-2xl font-semibold">{stage.sessions}</span>
              <span className="text-sm text-black/48">
                {stage.rateFromVisit.toFixed(1)}% of visits
              </span>
              <span className="text-sm text-black/48">
                {index === 0
                  ? "Entry"
                  : stage.dropOffFromPrevious.toFixed(1) + "% drop-off"}
              </span>
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminShell>
  );
}
