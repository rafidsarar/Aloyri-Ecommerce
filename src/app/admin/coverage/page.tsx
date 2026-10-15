import Link from "next/link";
import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";

const controls = [
  { group: "Storefront", rows: [
    ["Homepage sections, banners and layout", "/admin/homepage", "Editable", "Save directly to the storefront"],
    ["Product photography and descriptions", "/admin/products", "Editable", "Product identity, prices and stock remain in CRM"],
    ["Brand pictures", "/admin/brands", "Editable", "Brand directory and names remain in CRM"],
    ["Pages, FAQ and policies", "/admin/pages", "Editable", "Review changes on the customer-facing pages"],
    ["Website image uploads", "/admin/media", "Editable", "JPG, PNG or WebP; maximum 4 MB per upload"],
  ] },
  { group: "Marketing", rows: [
    ["Campaigns and collections", "/admin/merchandising", "Editable", "Verify promotion eligibility in checkout before relying on a campaign"],
    ["Search engine metadata", "/admin/seo", "Editable", "This is SEO; it does not configure storefront search ranking"],
    ["Visits and conversions", "/admin/analytics", "Read-only", "Analytics may lag live activity"],
  ] },
  { group: "Customer operations", rows: [
    ["Support and return requests", "/admin/customer-service", "Operational", "Order and return state is coordinated with CRM"],
    ["Product reviews", "/admin/reviews", "Operational", "Moderation affects customer-visible reviews"],
    ["Courier shipments", "/admin/delivery", "Read-only", "Courier and CRM records remain authoritative"],
    ["Payment settlements", "/admin/payments", "Read-only", "Financial records are not editable website content"],
  ] },
  { group: "Website settings", rows: [
    ["Brand identity, navigation, social links and footer", "/admin/settings", "Editable", "Shipping fees and payment methods remain in CRM"],
  ] },
  { group: "Administration", rows: [
    ["Owner account security", "/admin/security", "Sensitive", "Password and session actions must not be tested against production casually"],
    ["Version history and restore", "/admin/history", "Sensitive", "Restoring changes live content; use an isolated test environment"],
    ["Audit activity", "/admin/audit", "Read-only", "Review changes without altering records"],
    ["Operational health and backups", "/admin/operations", "Sensitive", "Do not run restore or retry actions against production for a UI test"],
  ] },
] as const;

export default async function OwnerControlCoveragePage() {
  const owner = await requireAdminPermission("dashboard.view");
  return <AdminShell username={owner.username} title="Website control coverage" subtitle="See what you can edit, what is monitored, and which business data stays in CRM.">
    <div className="space-y-5">
      <AdminCard>
        <h2 className="font-semibold">Owner-only website control</h2>
        <p className="mt-2 text-sm leading-6 text-black/65">Website content is managed here. CRM remains the source of truth for product and brand identities, prices, stock, orders, shipping fees and payment methods. This page is a control directory, not a claim that live save and upload workflows have been independently certified.</p>
      </AdminCard>
      {controls.map(section => <section key={section.group} aria-label={section.group} className="rounded-xl border border-black/10 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">{section.group}</h2>
        <div className="grid gap-3">
          {section.rows.map(([name, href, kind, note]) => <div key={href} className="grid gap-2 rounded-lg border border-black/10 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0"><h3 className="font-medium">{name}</h3><p className="mt-1 text-sm text-black/60">{note}</p></div>
            <Link href={href} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-black/15 px-3 text-sm font-medium hover:bg-black/5" aria-label={`Open ${name} (${kind})`}>{kind} · Open →</Link>
          </div>)}
        </div>
      </section>)}
      <p className="text-sm text-black/60">Production validation should be read-only. Test uploads, live saves, refunds, restoration and order changes only in an isolated Preview or E2E environment.</p>
    </div>
  </AdminShell>;
}
