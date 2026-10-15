import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";

/**
 * Read-only Owner map of the live website controls.
 * This view intentionally reads no customer records and performs no writes.
 * Keep classifications aligned with actual Admin editors and CRM contracts.
 */
const websiteControls = [
  { name: "Homepage banners, sections & product placement", href: "/admin/homepage", details: "Banner text, images, section visibility, promotions and homepage product ordering." },
  { name: "Product descriptions & media", href: "/admin/products", details: "Website slugs, photos, descriptions, routine, usage and ingredient notes. Prices and stock are locked to CRM." },
  { name: "Brand pictures", href: "/admin/brands", details: "Storefront pictures only. Brand identity and product membership remain in CRM." },
  { name: "Pages, policies & FAQ", href: "/admin/pages", details: "About, contact, shipping information, returns, privacy, terms and FAQ text." },
  { name: "Campaigns & collections", href: "/admin/merchandising", details: "Promotions, collection groups, merchandising visibility and scheduling." },
  { name: "Website images", href: "/admin/media", details: "Upload and select images for editable website sections." },
  { name: "Search-engine discoverability", href: "/admin/seo", details: "SEO titles, descriptions, indexing, canonical URLs and redirects; not the on-site search interface." },
  { name: "Appearance, header & footer", href: "/admin/settings", details: "Themes, navigation links, announcement, social URLs and customer contact details." },
];

const operationalControls = [
  { name: "Customer support & returns", href: "/admin/customer-service", details: "Review support cases and customer requests. Fulfillment stays in CRM." },
  { name: "Product reviews", href: "/admin/reviews", details: "Moderate submitted product reviews." },
  { name: "Delivery status", href: "/admin/delivery", details: "Inspect courier status and COD reconciliation; delivery operations are not reassigned to Ecommerce." },
  { name: "Payment status", href: "/admin/payments", details: "Inspect settlements and refund status; payment records are not a storefront content setting." },
  { name: "Website analytics", href: "/admin/analytics", details: "View traffic and conversion reports." },
  { name: "Account security", href: "/admin/security", details: "Owner password, sessions and recovery codes." },
  { name: "Version history & recovery", href: "/admin/history", details: "Review and restore earlier website content versions." },
  { name: "Audit trail", href: "/admin/audit", details: "Inspect logged website administration activity." },
  { name: "Operational health & backups", href: "/admin/operations", details: "Inspect sync health, backups and recovery readiness." },
];

const crmOwned = [
  "Product and brand creation, renaming, deletion and product-to-brand assignments",
  "Product inventory, selling prices and availability",
  "Order fulfillment and the authoritative order, return and refund workflow",
  "Shipping charges and payment methods used at checkout",
];

const developerOwned = [
  "Product-page section ordering and the shared product gallery/purchase layout",
  "On-site search overlay behavior, comparison interactions and their detailed interface layouts",
  "Cart and checkout interaction design, payment integration logic and customer-account behavior",
  "Global motion effects, complex animation timing and the underlying page templates",
];

function CoverageSection({ title, items }: { title: string; items: typeof websiteControls }) {
  return <section className="space-y-3" aria-label={title}>
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(item => <Link key={item.href} href={item.href} className="rounded-xl border border-black/10 bg-white p-5 transition hover:border-[#713a35]/35 hover:bg-[#fffaf6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#713a35]">
        <span className="flex items-start justify-between gap-3 text-sm font-semibold">{item.name}<span aria-hidden="true">↗</span></span>
        <p className="mt-2 text-xs leading-6 text-black/60">{item.details}</p>
      </Link>)}
    </div>
  </section>;
}

export default async function OwnerControlCoveragePage() {
  const admin = await requireAdminPermission("dashboard.view");
  return <AdminShell username={admin.username} title="Website control coverage" subtitle="See exactly what you can change directly in Ecommerce Admin, what belongs to CRM and what still requires development.">
    <div className="space-y-8">
      <div className="rounded-xl border border-[#713a35]/15 bg-[#fff9f5] p-5 text-sm leading-7">
        <strong>Owner-only website administration</strong>
        <p className="mt-1 text-black/65">This guide is read-only. Opening a control never changes the live store; saving an edit in its destination does. No staff or team management is needed.</p>
      </div>
      <CoverageSection title="Website content you can edit" items={websiteControls} />
      <CoverageSection title="Website operations you can review or manage" items={operationalControls} />
      <section aria-label="CRM-owned operations" className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Managed in Aloyri CRM</h2>
        <p className="mt-2 text-sm text-black/60">Ecommerce displays or synchronizes these values. Do not edit them in this Admin.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-black/75">{crmOwned.map(item => <li key={item}>{item}</li>)}</ul>
      </section>
      <section aria-label="Developer-controlled storefront behavior" className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Not yet configurable from Admin</h2>
        <p className="mt-2 text-sm text-black/60">These are engineering changes, not missing permissions. They should be developed and tested on a separate branch.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-black/75">{developerOwned.map(item => <li key={item}>{item}</li>)}</ul>
      </section>
      <p className="text-xs leading-6 text-black/50">Coverage describes code-level availability and intended ownership. Live save results, media storage reliability and every customer-facing effect require authenticated acceptance checks; this page does not claim those tests passed.</p>
    </div>
  </AdminShell>;
}
