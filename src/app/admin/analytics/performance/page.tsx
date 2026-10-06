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

function rating(metric: string, value: number) {
  if (metric === "LCP") return value <= 2500 ? "Good" : value <= 4000 ? "Needs work" : "Poor";
  if (metric === "INP") return value <= 200 ? "Good" : value <= 500 ? "Needs work" : "Poor";
  if (metric === "CLS") return value <= 0.1 ? "Good" : value <= 0.25 ? "Needs work" : "Poor";
  if (metric === "TTFB") return value <= 800 ? "Good" : value <= 1800 ? "Needs work" : "Poor";
  return "Unknown";
}

export default async function PerformanceAnalyticsPage({
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
      title="Real-user performance"
      subtitle="Anonymous real-browser performance samples collected through the same first-party analytics preference."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.webVitals.map((row) => (
          <AdminCard key={row.metric}>
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
              {row.metric} · p75
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {row.metric === "CLS" ? row.p75.toFixed(3) : row.p75 + " ms"}
            </p>
            <p className="mt-1 text-xs text-black/42">
              {rating(row.metric, row.p75)} · {row.samples} samples
            </p>
            <p className="mt-2 text-xs text-black/35">
              Average: {row.metric === "CLS" ? row.average.toFixed(3) : row.average + " ms"}
            </p>
          </AdminCard>
        ))}
      </div>

      {!report.webVitals.length ? (
        <AdminCard className="mt-5">
          <p className="text-sm text-black/45">
            No real-user performance samples have been collected in this period yet.
          </p>
        </AdminCard>
      ) : null}
    </AdminShell>
  );
}
