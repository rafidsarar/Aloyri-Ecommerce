import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { buildReviewAnalytics } from "@/lib/review-analytics";

function period(value: string | undefined) {
  const days = Number(value);
  return [7, 30, 90].includes(days) ? days : 30;
}

export default async function ReviewAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPermission("analytics.view");
  const query = await searchParams;
  const days = period(query.days);
  const [report, catalog] = await Promise.all([
    buildReviewAnalytics(days),
    fetchCrmCatalog(),
  ]);
  const products = catalog.ok ? catalog.body.products : [];
  const names = new Map(
    products.map(
      (product) => [product.id, product.brand + " · " + product.name] as const,
    ),
  );
  const covered = new Set(report.products.map((row) => row.productId));
  const uncovered = products.filter((product) => !covered.has(product.id));
  const ratingTrend =
    report.totals.averageDelta === 0
      ? "No change"
      : (report.totals.averageDelta > 0 ? "+" : "") +
        report.totals.averageDelta.toFixed(2);

  return (
    <AdminShell
      username={admin.username}
      title="Review & trust intelligence"
      subtitle="Measure verified-review participation, rating health, coverage gaps and product conversion around the first approved review."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {[7, 30, 90].map((value) => (
          <Link
            key={value}
            href={"/admin/analytics/reviews?days=" + value}
            className={
              value === days
                ? "rounded-full bg-[#713a35] px-4 py-2 text-xs font-semibold text-white"
                : "rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-black/55"
            }
          >
            {value} days
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">
            Verified eligibility checks
          </p>
          <p className="mt-2 text-3xl font-semibold">{report.totals.eligibleChecks}</p>
          <p className="mt-1 text-xs text-black/42">Delivered-order verification</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">
            Review submissions
          </p>
          <p className="mt-2 text-3xl font-semibold">{report.totals.submissions}</p>
          <p className="mt-1 text-xs text-black/42">
            {report.totals.submissionRate.toFixed(1)}% of verified checks
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">
            Average approved rating
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {report.totals.approved ? report.totals.currentAverage.toFixed(2) : "—"}
          </p>
          <p className="mt-1 text-xs text-black/42">
            vs prior {days} days · {ratingTrend}
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">
            Moderation queue
          </p>
          <p className="mt-2 text-3xl font-semibold">{report.totals.pending}</p>
          <p className="mt-1 text-xs text-black/42">
            {report.totals.flagged} flagged · {report.totals.hidden} hidden
          </p>
        </AdminCard>
      </div>

      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so product names and review-coverage gaps cannot be resolved fully.
        </AdminNotice>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <AdminCard>
          <p className="text-sm font-semibold">Product review performance</p>
          <p className="mt-1 text-xs leading-5 text-black/42">
            Conversion compares a 30-day window before the first approved review with up to 30 days after it. Treat small samples as directional, not causal.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Reviews</th>
                  <th className="pb-3">Avg rating</th>
                  <th className="pb-3">Low ratings</th>
                  <th className="pb-3">Before</th>
                  <th className="pb-3">After</th>
                  <th className="pb-3">Δ conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {report.products.map((row) => (
                  <tr key={row.productId}>
                    <td className="py-4 pr-5">
                      <p className="font-semibold">{names.get(row.productId) || row.productId}</p>
                      <p className="mt-1 text-xs text-black/38">{row.productId}</p>
                    </td>
                    <td className="py-4 pr-5">{row.approvedReviews}</td>
                    <td className="py-4 pr-5">{row.averageRating.toFixed(2)}</td>
                    <td className="py-4 pr-5">{row.lowRatings}</td>
                    <td className="py-4 pr-5">
                      {row.before.conversionRate.toFixed(1)}%
                      <span className="block text-[10px] text-black/38">
                        {row.before.orders} orders / {row.before.views} views
                      </span>
                    </td>
                    <td className="py-4 pr-5">
                      {row.after.conversionRate.toFixed(1)}%
                      <span className="block text-[10px] text-black/38">
                        {row.after.orders} orders / {row.after.views} views
                      </span>
                    </td>
                    <td className="py-4">
                      {row.conversionDelta > 0 ? "+" : ""}
                      {row.conversionDelta.toFixed(1)} pp
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!report.products.length ? (
            <p className="py-8 text-center text-sm text-black/45">
              No approved product reviews yet.
            </p>
          ) : null}
        </AdminCard>

        <div className="grid gap-5">
          <AdminCard>
            <p className="text-sm font-semibold">Review coverage gaps</p>
            <p className="mt-1 text-xs text-black/42">
              Active catalog products with no approved reviews.
            </p>
            <div className="mt-4 divide-y divide-black/7">
              {uncovered.slice(0, 12).map((product) => (
                <div key={product.id} className="py-3">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="mt-1 text-xs text-black/40">{product.brand} · {product.id}</p>
                </div>
              ))}
              {!uncovered.length ? (
                <p className="py-4 text-sm text-emerald-700">
                  Every current catalog product has approved review coverage.
                </p>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard>
            <p className="text-sm font-semibold">Trust health</p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-black/50">Approved</span>
                <strong>{report.totals.approved}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-black/50">Helpful votes</span>
                <strong>{report.totals.helpfulVotes}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-black/50">Products covered</span>
                <strong>{covered.size} / {products.length || covered.size}</strong>
              </div>
            </div>
            <Link
              href="/admin/reviews"
              className="mt-5 inline-flex text-xs font-semibold text-[#713a35]"
            >
              Open moderation queue →
            </Link>
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}
