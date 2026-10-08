import Link from "next/link";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { logoutAdmin } from "@/app/admin/actions";
import {
  currentAdmin,
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/admin-auth";

const nav: Array<{
  label: string;
  href: string;
  permission: AdminPermission;
  group: string;
}> = [
  { group: "Workspace", label: "Overview", href: "/admin", permission: "dashboard.view" },
  { group: "Storefront", label: "Homepage Builder", href: "/admin/homepage", permission: "homepage.view" },
  { group: "Storefront", label: "Products", href: "/admin/products", permission: "products.view" },
  { group: "Orders & service", label: "Reviews", href: "/admin/reviews", permission: "products.view" },
  { group: "Storefront", label: "Pages & FAQ", href: "/admin/pages", permission: "pages.view" },
  { group: "Storefront", label: "Media", href: "/admin/media", permission: "media.view" },
  { group: "Growth", label: "Sections & Merchandising", href: "/admin/merchandising", permission: "merchandising.view" },
  { group: "Growth", label: "Analytics", href: "/admin/analytics", permission: "analytics.view" },
  { group: "Orders & service", label: "Payments", href: "/admin/payments", permission: "analytics.view" },
  { group: "Orders & service", label: "Delivery", href: "/admin/delivery", permission: "analytics.view" },
  { group: "Orders & service", label: "Customer Service", href: "/admin/customer-service", permission: "support.view" },
  { group: "Growth", label: "SEO", href: "/admin/seo", permission: "seo.view" },
  { group: "Storefront", label: "Publishing", href: "/admin/publishing", permission: "publishing.view" },
  { group: "Administration", label: "Team", href: "/admin/staff", permission: "staff.view" },
  { group: "Administration", label: "Audit", href: "/admin/audit", permission: "audit.view" },
  { group: "Administration", label: "Operations", href: "/admin/operations", permission: "health.view" },
  { group: "Administration", label: "Security", href: "/admin/security", permission: "security.self" },
  { group: "Administration", label: "Appearance & Settings", href: "/admin/settings", permission: "settings.view" },
];

export async function AdminShell({
  username,
  title,
  subtitle,
  children,
}: {
  username: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const session = await currentAdmin();
  const visibleNav = session
    ? nav.filter((item) => hasAdminPermission(session, item.permission))
    : [];

  return (
    <div className="admin-workspace min-h-screen text-[#2f211f]">
      <a href="#admin-content" className="skip-link">Skip to admin content</a>
      <header className="admin-header">
        <Link href="/admin" className="font-semibold tracking-tight">Aloyri <span className="ml-2 text-xs font-normal text-black/55">Ecommerce Admin</span></Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-store-link">View store ↗</Link>
          <span className="hidden text-xs text-black/60 sm:inline">{session?.displayName || username}</span>
          <form action={logoutAdmin}><button type="submit" className="admin-signout">Sign out</button></form>
        </div>
      </header>
      <div className="admin-frame">
        <aside className="admin-sidebar"><AdminNavigation items={visibleNav} /></aside>
        <main id="admin-content" tabIndex={-1} className="admin-main min-w-0">
          <div className="admin-page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminNotice({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "neutral";
}) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-black/10 bg-white text-[#2f211f]/65";
  return (
    <div role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${classes}`}>
      {children}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`admin-card rounded-xl border border-black/10 bg-white p-5 ${className}`}
    >
      {children}
    </section>
  );
}
