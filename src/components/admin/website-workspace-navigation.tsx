import Link from "next/link";
import { hasAdminPermission, type AdminSession } from "@/lib/admin-auth";

export type WebsiteWorkspace = "design" | "settings" | "pages" | "campaigns" | "media";

const areas = [
  { id: "design", label: "Design & banners", description: "Layout, hero, sections and previews", permission: "homepage.view" },
  { id: "settings", label: "Store settings", description: "Navigation, colors, footer and support", permission: "settings.view" },
  { id: "pages", label: "Pages & FAQ", description: "Direct editing of customer-facing copy", permission: "pages.view" },
  { id: "campaigns", label: "Campaigns", description: "Collections, promotions and product placement", permission: "merchandising.view" },
  { id: "media", label: "Media library", description: "Browse your current website assets", permission: "media.view" },
] as const;

export function workspaceAllowed(admin: Pick<AdminSession, "role" | "permissions">, workspace: WebsiteWorkspace) {
  const area = areas.find(item => item.id === workspace);
  return Boolean(area && hasAdminPermission(admin, area.permission));
}

export function WebsiteWorkspaceNavigation({ admin, selected }: {
  admin: Pick<AdminSession, "role" | "permissions">;
  selected: WebsiteWorkspace;
}) {
  return (
    <div className="mb-5 space-y-3">
      <nav aria-label="Storefront Builder workspaces" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {areas.filter(item => hasAdminPermission(admin, item.permission)).map(item => (
          <Link key={item.id} href={`/admin/builder?workspace=${item.id}`} aria-current={selected === item.id ? "page" : undefined}
            className={`min-w-0 rounded-xl border px-3 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#713a35] ${selected === item.id ? "border-[#713a35] bg-[#713a35] text-white" : "border-black/10 bg-white text-[#432824] hover:border-[#713a35]/35"}`}>
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className={`mt-1 block text-xs leading-5 ${selected === item.id ? "text-white/80" : "text-black/55"}`}>{item.description}</span>
          </Link>
        ))}
      </nav>
      <details className="rounded-xl border border-black/10 bg-white px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#713a35]">More website management tools</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["Product photography", "/admin/products", "products.view"],
            ["SEO", "/admin/seo", "seo.view"],
            ["Analytics", "/admin/analytics", "analytics.view"],
            ["Customer service", "/admin/customer-service", "support.view"],
            ["Delivery", "/admin/delivery", "analytics.view"],
            ["Reviews", "/admin/reviews", "products.view"],
            ["Staff access", "/admin/staff", "staff.view"],
            ["Security", "/admin/security", "security.self"],
            ["Version history", "/admin/history", "publishing.view"],
            ["Audit trail", "/admin/audit", "audit.view"],
            ["Payments", "/admin/payments", "analytics.view"],
            ["Operational health", "/admin/operations", "health.view"],
          ] as const).filter(([, , permission]) => hasAdminPermission(admin, permission)).map(([label, href]) => (
            <Link href={href} key={href} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold hover:bg-[#fff7f3]">{label} →</Link>
          ))}
        </div>
      </details>
    </div>
  );
}
