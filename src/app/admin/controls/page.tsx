import Link from "next/link";
import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";

/**
 * Read-only source-of-truth guide for the sole Owner.
 * This page never writes to the live storefront, CRM, or private customer data.
 */
const groups = [
  {
    title: "Edit directly in Ecommerce",
    description: "Saving these controls updates website-owned content without changing CRM records.",
    items: [
      ["Homepage banners and sections", "/admin/homepage", "Images, text, hero settings and section visibility"],
      ["Product presentation", "/admin/products", "Photos, descriptions, routine instructions and care notes"],
      ["Brand pictures", "/admin/brands", "Website pictures for CRM-owned brand names"],
      ["Pages and FAQ", "/admin/pages", "About, policies, shipping information, contact and FAQs"],
      ["Images", "/admin/media", "Reusable website-owned image library"],
      ["Campaigns and collections", "/admin/merchandising", "Website promotion displays, product groups and timing"],
      ["Search and discovery", "/admin/merchandising/discovery", "Synonyms, popular search terms and category order"],
      ["Product ranking and badges", "/admin/merchandising/products", "Website browse priority and search boosts"],
      ["Recommendations", "/admin/merchandising/recommendations", "Related items and complete-the-routine rules"],
      ["SEO", "/admin/seo", "Search appearance, metadata and redirects"],
      ["Appearance and footer", "/admin/settings", "Header, layout, theme, social links and support contacts"],
    ],
  },
  {
    title: "Customer-facing operations",
    description: "These tools moderate website-owned content or monitor operational information.",
    items: [
      ["Customer care", "/admin/customer-service", "Support and return-request follow-up"],
      ["Product reviews", "/admin/reviews", "Approve, flag and hide customer reviews"],
      ["Delivery intelligence", "/admin/delivery", "Read-only courier and COD information"],
      ["Payment intelligence", "/admin/payments", "Read-only settlements and refund status"],
      ["Analytics", "/admin/analytics", "Storefront activity and CRM-confirmed sales reporting"],
    ],
  },
  {
    title: "Owner protection and recovery",
    description: "Administration is restricted to the Owner account; there is no staff-management interface.",
    items: [
      ["Account security", "/admin/security", "Password, recovery codes and active session invalidation"],
      ["Change history", "/admin/history", "Inspect and restore previously saved website content"],
      ["Activity history", "/admin/audit", "Read-only log of administrative changes"],
      ["Operational health", "/admin/operations", "Readiness checks, backups and exceptional recovery"],
    ],
  },
] as const;

const crmResponsibilities = [
  "Product creation, deletion, names, categories and brand names",
  "Prices, stock, actual discounts and order fulfillment",
  "Customer orders, financial settlements and operational shipping charges",
] as const;

export default async function OwnerControlGuide() {
  const admin = await requireAdminPermission("dashboard.view");
  return (
    <AdminShell
      username={admin.username}
      title="Website control guide"
      subtitle="See what the Owner can change here, what remains in CRM, and what still needs development."
    >
      <div className="space-y-6">
        <AdminCard>
          <h2 className="text-lg font-semibold">What controls your website?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">
            Use the links below to edit website-owned content directly. Changes to storefront
            copy and images are saved live. Read-only reports do not alter customer orders,
            payment records or CRM stock.
          </p>
          <p className="mt-3 text-xs text-black/55">
            This guide is read-only and does not use a builder, publishing workflow, or staff accounts.
          </p>
        </AdminCard>

        {groups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <p className="mt-1 mb-4 text-sm text-black/60">{group.description}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map(([title, href, description]) => (
                <Link
                  key={href}
                  href={href}
                  className="group min-w-0 rounded-xl border border-black/10 bg-white p-4 transition hover:border-[#713a35]/30 hover:bg-[#fffaf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#713a35]"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-[#321f1c]">
                    {title}<span aria-hidden="true" className="text-[#713a35]">↗</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-black/60">{description}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard>
            <h2 className="text-base font-semibold">Managed in Aloyri CRM</h2>
            <p className="mt-2 text-sm text-black/60">Ecommerce mirrors these operational values; editing them here would risk conflicting records.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-black/70">
              {crmResponsibilities.map((entry) => <li key={entry}>{entry}</li>)}
            </ul>
          </AdminCard>
          <AdminCard>
            <h2 className="text-base font-semibold">Still requires development</h2>
            <p className="mt-2 text-sm leading-6 text-black/70">
              Changing the fixed structure of product-detail sections or custom page animations
              is not currently a simple Admin setting. Product descriptions, photos, directions,
              recommendations and other supported content are editable above.
            </p>
            <p className="mt-3 text-xs leading-5 text-black/55">
              Never alter live CRM transactions to test a visual setting.
            </p>
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}
