import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { buildCheckoutAnalytics } from "@/lib/checkout-analytics";

function period(value: string | undefined) {
  const days = Number(value);
  return [1, 7, 30, 90].includes(days) ? days : 30;
}

export default async function CheckoutAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPermission("analytics.view");
  const query = await searchParams;
  const days = period(query.days);
  const report = await buildCheckoutAnalytics(days);
  const s = report.summary;

  const stages = [
    ["Cart sessions", s.cartSessions, 100],
    ["Checkout started", s.checkoutStarts, s.cartToCheckoutRate],
    ["Reached review", s.reviewSessions, s.checkoutToReviewRate],
    ["Submitted order", s.submitSessions, s.reviewToSubmitRate],
    ["CRM-confirmed order", s.orderSessions, s.submitToOrderRate],
  ] as const;

  return (
    <AdminShell
      username={admin.username}
      title="Cart & checkout conversion"
      subtitle="Anonymous first-party diagnostics for cart behavior, checkout friction and CRM-confirmed order completion. No names, email addresses, phone numbers or delivery addresses are stored in analytics."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {[1, 7, 30, 90].map((value) => (
          <Link
            key={value}
            href={"/admin/analytics/checkout?days=" + value}
            className={
              value === days
                ? "rounded-full bg-[#713a35] px-4 py-2 text-xs font-semibold text-white"
                : "rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-black/55"
            }
          >
            {value === 1 ? "Today" : value + " days"}
          </Link>
        ))}
      </div>

      {!s.checkoutStarts ? (
        <AdminNotice tone="neutral">
          No checkout sessions are recorded in this period yet.
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Cart → checkout", s.cartToCheckoutRate.toFixed(1) + "%", s.cartSessions + " cart sessions"],
          ["Checkout → order", s.checkoutToOrderRate.toFixed(1) + "%", s.checkoutStarts + " checkout sessions"],
          ["Validation errors", s.validationErrors, "field-level friction events"],
          ["Checkout failures", s.failureSessions, "unique affected sessions"],
          ["Cart edits", s.cartChanges, s.cartRemovals + " removals"],
          ["Review reached", s.reviewSessions, s.checkoutToReviewRate.toFixed(1) + "% of checkout starts"],
          ["Order submits", s.submitSessions, s.reviewToSubmitRate.toFixed(1) + "% of review sessions"],
          ["Confirmed orders", s.orderSessions, s.submitToOrderRate.toFixed(1) + "% of submits"],
        ].map(([label, value, copy]) => (
          <AdminCard key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-black/42">{copy}</p>
          </AdminCard>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <AdminCard>
          <p className="text-sm font-semibold">Checkout progression</p>
          <div className="mt-5 grid gap-4">
            {stages.map(([label, sessions, rate], index) => (
              <div key={label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{index + 1}. {label}</span>
                  <span>{sessions}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-[#713a35]"
                    style={{
                      width:
                        Math.max(
                          sessions ? 2 : 0,
                          index === 0 ? 100 : Math.min(100, rate),
                        ) + "%",
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-black/38">
                  {index === 0 ? "Cart baseline" : rate.toFixed(1) + "% from previous stage"}
                </p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Validation friction</p>
          <p className="mt-1 text-xs text-black/42">
            Fields most often blocking progression to order review.
          </p>
          <div className="mt-4 divide-y divide-black/7">
            {report.fields.length ? (
              report.fields.map((row) => (
                <div key={row.key} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="font-medium">{row.key}</span>
                  <span>{row.count}</span>
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-black/45">No validation errors recorded.</p>
            )}
          </div>
        </AdminCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <AdminCard>
          <p className="text-sm font-semibold">Checkout failure codes</p>
          <p className="mt-1 text-xs text-black/42">
            Operational failure categories only; customer-entered values are excluded.
          </p>
          <div className="mt-4 divide-y divide-black/7">
            {report.failures.length ? (
              report.failures.map((row) => (
                <div key={row.key} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="font-medium">{row.key}</span>
                  <span>{row.count}</span>
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-black/45">No checkout failures recorded.</p>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Checkout by device</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[430px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                  <th className="pb-3">Device</th>
                  <th className="pb-3">Starts</th>
                  <th className="pb-3">Orders</th>
                  <th className="pb-3">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {report.devices.map((row) => (
                  <tr key={row.device}>
                    <td className="py-3 font-medium">{row.device}</td>
                    <td className="py-3">{row.starts}</td>
                    <td className="py-3">{row.orders}</td>
                    <td className="py-3">{row.conversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
