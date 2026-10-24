import Link from "next/link";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

const tasks = [
  ["Control coverage", "See what the website Admin controls and what stays in CRM.", "/admin/coverage"],
  ["Homepage", "Change banners, text and homepage sections.", "/admin/homepage"],
  ["Products", "Update product photos and descriptions. Prices and stock remain in CRM.", "/admin/products"],
  ["Shop by brands", "Set storefront pictures for brands created in CRM.", "/admin/brands"],
  ["Pages & FAQ", "Edit information, policies and answers.", "/admin/pages"],
  ["Campaigns & collections", "Manage promotions and product groups.", "/admin/merchandising"],
  ["Images", "Upload and find website photos.", "/admin/media"],
  ["Customer care", "Respond to support and return requests.", "/admin/customer-service"],
  ["Analytics", "Check visits and shopping performance.", "/admin/analytics"],
  ["SEO metadata", "Control search engine titles and discoverability; storefront search ranking is separate.", "/admin/seo"],
  ["Reviews", "Moderate customer product reviews.", "/admin/reviews"],
  ["Delivery", "Monitor courier shipments and delivery status.", "/admin/delivery"],
  ["Payments", "Monitor payments, settlements and refund status.", "/admin/payments"],
  ["Account security", "Protect your owner account and recovery options.", "/admin/security"],
  ["Health & backups", "Check website operations and backup readiness.", "/admin/operations"],
  ["Settings", "Manage navigation, appearance and contact details.", "/admin/settings"],
] as const;
export function OwnerDashboard({config,productCount}:{config:StorefrontConfig;productCount:number|null}) {
  return <div className="space-y-7">
    <section aria-labelledby="admin-tasks"><h2 id="admin-tasks" className="mb-1 text-lg font-semibold">What would you like to update?</h2><p className="mb-5 text-sm text-black/60">Choose a section to manage your website. Operational reports and account controls do not change storefront content.</p>
      <div className="admin-task-grid">{tasks.map(([title,copy,href])=><Link key={href} href={href} className="admin-task-card"><span className="flex items-center justify-between gap-3"><strong>{title}</strong><span aria-hidden="true">→</span></span><p>{copy}</p><span className="admin-task-action">Open {title.toLowerCase()}</span></Link>)}</div>
    </section>
    <div className="rounded-xl border border-[#713a35]/15 bg-[#fffaf7] px-5 py-4 text-sm sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="font-semibold text-[#321f1c]">Where can I change this?</p><p className="mt-1 text-black/60">Browse all Owner controls, CRM responsibilities and features requiring development.</p></div><Link href="/admin/controls" className="mt-3 inline-flex min-h-10 shrink-0 items-center rounded-lg border border-[#713a35]/20 bg-white px-4 py-2 font-semibold text-[#713a35] sm:mt-0">Website control guide →</Link></div>
    <div className="admin-dashboard-summary" aria-label="Store summary">
      <div><span>Products</span><strong>{productCount ?? "Unavailable"}</strong><small>Price and stock sync from CRM</small></div>
      <div><span>Campaigns</span><strong>{config.merchandising.campaigns.length}</strong><small>Saved promotions</small></div>
      <div><span>Collections</span><strong>{config.merchandising.collections.length}</strong><small>Your product groups</small></div>
    </div>
    <div className="rounded-xl border border-black/10 bg-white p-5 text-sm"><p className="font-semibold">Your changes save directly to the website</p><p className="mt-1 text-black/60">You can restore earlier content in <Link className="underline" href="/admin/history">History & restore</Link>. Product names, brands, prices, stock and order operations are managed in CRM. This Admin controls website content and brand pictures.</p><p className="mt-3 text-xs text-black/50">Last content update: <time dateTime={config.updatedAt}>{new Date(config.updatedAt).toLocaleString("en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"})} (Bangladesh time)</time></p></div>
  </div>;
}
