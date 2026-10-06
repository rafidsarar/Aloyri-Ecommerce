import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { lifecycleReadiness } from "@/lib/lifecycle-orchestration";
import { buildRetentionAnalytics } from "@/lib/retention-analytics";

function period(value: string | undefined) {
  const days = Number(value);
  return [7, 30, 90].includes(days) ? days : 30;
}

export default async function RetentionAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPermission("analytics.view");
  const query = await searchParams;
  const days = period(query.days);
  const [report, catalog, lifecycle] = await Promise.all([
    buildRetentionAnalytics(days),
    fetchCrmCatalog(),
    Promise.resolve(lifecycleReadiness()),
  ]);

  const names = new Map(
    catalog.ok
      ? catalog.body.products.map(
          (product) => [product.id, product.brand + " · " + product.name] as const,
        )
      : [],
  );
  const s = report.summary;

  return (
    <AdminShell
      username={admin.username}
      title="Customer retention intelligence"
      subtitle="Pseudonymous repeat-purchase analysis from CRM-confirmed website orders. Raw customer names, phone numbers, email addresses, delivery addresses and order numbers are excluded from this analytics layer."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {[7, 30, 90].map((value) => (
          <Link
            key={value}
            href={"/admin/analytics/retention?days=" + value}
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

      <AdminNotice tone="neutral">
        {report.coverage.note} Current retention coverage: {report.coverage.ordersWithCustomerHash} confirmed orders in the 365-day analysis window.
      </AdminNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["First-time orders", s.firstTimeOrders, "Current period"],
          ["Repeat orders", s.repeatOrders, "Current period"],
          ["Repeat purchase rate", s.repeatPurchaseRate.toFixed(1) + "%", report.coverage.ordersWithCustomerHash ? "Observed 365-day cohort" : "Awaiting cohort data"],
          ["Avg. time between orders", s.averageDaysBetweenOrders ? s.averageDaysBetweenOrders.toFixed(1) + " days" : "—", "Observed repeat customers"],
          ["Reorder conversion", s.reorderConversionRate.toFixed(1) + "%", s.reorderOrderSessions + " order sessions / " + s.reorderSessions + " reorder sessions"],
          ["Wishlist conversion", s.wishlistConversionRate.toFixed(1) + "%", s.wishlistOrderSessions + " order sessions / " + s.wishlistSessions + " wishlist sessions"],
          ["Reviewed → repeat", s.reviewToRepeatRate.toFixed(1) + "%", s.reviewRepeatCustomers + " repeat customers / " + s.reviewedCustomers + " reviewed customers"],
          ["Returning customers", s.returningCustomers, "Current period"],
        ].map(([label, value, copy]) => (
          <AdminCard key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-black/42">{copy}</p>
          </AdminCard>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <AdminCard>
          <p className="text-sm font-semibold">Customer lifecycle states</p>
          <p className="mt-1 text-xs leading-5 text-black/42">
            Heuristic operational segments from observed order timing. They are marketing signals, not CRM customer status fields.
          </p>
          <div className="mt-4 divide-y divide-black/7">
            {Object.entries(report.lifecycle).map(([state, count]) => (
              <div key={state} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium">{state}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Lifecycle email readiness</p>
          <p className="mt-1 text-xs leading-5 text-black/42">
            These automations remain dormant until the verified sending domain, sender, explicit switch and CRM lifecycle events are all ready.
          </p>
          <div className="mt-4 grid gap-3 text-sm">
            {[
              ["Email domain", lifecycle.domainReady],
              ["Sender", lifecycle.senderReady],
              ["Lifecycle switch", lifecycle.lifecycleSwitch],
              ["CRM delivery/stock events", lifecycle.crmEventsReady],
            ].map(([label, ready]) => (
              <div key={String(label)} className="flex justify-between gap-4">
                <span className="text-black/50">{label}</span>
                <strong className={ready ? "text-emerald-700" : "text-amber-700"}>
                  {ready ? "Ready" : "Pending"}
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-black/7 pt-4">
            {Object.entries(lifecycle.triggers).map(([trigger, enabled]) => (
              <div key={trigger} className="flex justify-between gap-4 py-2 text-xs">
                <span>{trigger.replaceAll("-", " ")}</span>
                <strong>{enabled ? "Active" : "Dormant"}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-black/7 pt-4">
            <p className="text-xs font-semibold">Prepared orchestration policies</p>
            <div className="mt-3 grid gap-3">
              {lifecycle.policies.map((policy) => (
                <div key={policy.trigger} className="rounded-lg bg-[#f7f4f2] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-xs">{policy.trigger.replaceAll("-", " ")}</strong>
                    <span className="text-[10px] uppercase tracking-[.1em] text-black/38">
                      {policy.source} · {policy.timing}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-black/48">{policy.description}</p>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <AdminCard>
          <p className="text-sm font-semibold">Products generating repeat business</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Repeat customers</th>
                  <th className="pb-3">Repeat units</th>
                  <th className="pb-3">Repeat order lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {report.repeatProducts.map((row) => (
                  <tr key={row.productId}>
                    <td className="py-4 pr-4 font-medium">{names.get(row.productId) || row.productId}</td>
                    <td className="py-4 pr-4">{row.repeatCustomers}</td>
                    <td className="py-4 pr-4">{row.repeatUnits}</td>
                    <td className="py-4">{row.repeatOrderLines}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!report.repeatProducts.length ? (
            <p className="py-6 text-sm text-black/45">No repeat-product signal is available yet.</p>
          ) : null}
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Common product combinations</p>
          <p className="mt-1 text-xs text-black/42">Pairs appearing together in CRM-confirmed website orders.</p>
          <div className="mt-4 divide-y divide-black/7">
            {report.combinations.map((row) => (
              <div key={row.productA + row.productB} className="py-3">
                <p className="text-sm font-medium">
                  {names.get(row.productA) || row.productA}
                </p>
                <p className="mt-1 text-xs text-black/45">
                  + {names.get(row.productB) || row.productB}
                </p>
                <p className="mt-1 text-[10px] text-black/35">{row.orders} orders together</p>
              </div>
            ))}
            {!report.combinations.length ? (
              <p className="py-4 text-sm text-black/45">No combination signal yet.</p>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
