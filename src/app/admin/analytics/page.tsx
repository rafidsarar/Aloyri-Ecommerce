import Link from "next/link";
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

function money(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

function change(value: number | null) {
  if (value === null) return "new";
  if (value === 0) return "0%";
  return (value > 0 ? "+" : "") + value.toFixed(1) + "%";
}

export default async function AnalyticsDashboard({
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
      title="Analytics & conversion intelligence"
      subtitle="Anonymous first-party storefront analytics with CRM-confirmed order revenue. Customer identity, addresses, phone numbers and order numbers are not stored in this analytics layer."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[1, 7, 30, 90].map((value) => (
            <Link
              key={value}
              href={"/admin/analytics?days=" + value}
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
        <a
          href={"/api/admin/analytics/export?days=" + days + "&view=summary"}
          className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
        >
          Export CSV
        </a>
      </div>

      {report.summary.sessions === 0 ? (
        <AdminNotice tone="neutral">
          The analytics datastore has no sessions in this period yet. New first-party events will begin populating this dashboard after this release is published.
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Visitors", report.summary.visitors, change(report.change.visitors)],
          ["Sessions", report.summary.sessions, change(report.change.sessions)],
          ["Orders", report.summary.orders, change(report.change.orders)],
          ["Revenue", money(report.summary.revenueBdt), change(report.change.revenueBdt)],
          ["Conversion", report.summary.conversionRate.toFixed(2) + "%", change(report.change.conversionRate)],
          ["Average order", money(report.summary.averageOrderValueBdt), change(report.change.averageOrderValueBdt)],
          ["Items / order", report.summary.itemsPerOrder.toFixed(2), change(report.change.itemsPerOrder)],
          ["Cart abandonment", report.summary.cartAbandonmentRate.toFixed(2) + "%", change(report.change.cartAbandonmentRate)],
        ].map(([label, value, delta]) => (
          <AdminCard key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-black/42">vs previous period · {delta}</p>
          </AdminCard>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <AdminCard>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Conversion funnel</p>
              <p className="mt-1 text-xs text-black/42">
                Session-level progression from visit to CRM-confirmed order.
              </p>
            </div>
            <Link href={"/admin/analytics/funnel?days=" + days} className="text-xs font-semibold text-[#713a35]">
              Full funnel
            </Link>
          </div>
          <div className="mt-5 divide-y divide-black/7">
            {report.funnel.map((stage) => (
              <div key={stage.stage} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3 text-sm">
                <span className="font-medium">{stage.stage}</span>
                <span>{stage.sessions}</span>
                <span className="w-24 text-right text-xs text-black/45">
                  {stage.rateFromVisit.toFixed(1)}% of visits
                </span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Conversion intelligence</p>
          <p className="mt-1 text-xs text-black/42">
            Actionable signals from product, campaign, collection and search behavior.
          </p>
          <div className="mt-4 divide-y divide-black/7">
            {report.recommendations.length ? (
              report.recommendations.slice(0, 8).map((item, index) => (
                <Link key={item.kind + index} href={item.href} className="block py-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-black/45">{item.detail}</p>
                </Link>
              ))
            ) : (
              <p className="py-4 text-sm text-black/45">
                More traffic is needed before meaningful recommendations can be generated.
              </p>
            )}
          </div>
        </AdminCard>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Products", "Views, clicks, add-to-cart and order conversion.", "/admin/analytics/products"],
          ["Campaigns", "Impressions, clicks, attributed orders and revenue.", "/admin/analytics/campaigns"],
          ["Collections", "Views, product engagement and attributed conversion.", "/admin/analytics/collections"],
          ["Merchandising", "Hero and homepage section impressions, clicks and conversion.", "/admin/analytics/merchandising"],
          ["Search", "Popular searches, product engagement and demand gaps.", "/admin/analytics/search"],
          ["Recommendations", "Related-product and routine recommendation impressions, clicks and attributed conversion.", "/admin/analytics/recommendations"],
          ["Traffic", "Source, medium and device conversion performance.", "/admin/analytics/traffic"],
          ["Performance", "Real-user LCP, INP, CLS and TTFB.", "/admin/analytics/performance"],
          ["Funnel", "Visit → product → cart → checkout → order drop-off.", "/admin/analytics/funnel"],
          ["UTM builder", "Create clean trackable campaign links.", "/admin/analytics/utm"],
          ["Privacy", "Understand what analytics stores and deliberately excludes.", "/admin/analytics/privacy"],
        ].map(([title, copy, href]) => (
          <Link key={href} href={href + (href.includes("utm") || href.includes("privacy") ? "" : "?days=" + days)}>
            <AdminCard className="h-full transition hover:border-[#713a35]/20">
              <p className="text-base font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-6 text-black/48">{copy}</p>
            </AdminCard>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
