import Link from "next/link";
import { AdminSectionLinks } from "@/components/admin/admin-section-links";
import { AdminEditGuard } from "@/components/admin/admin-edit-guard";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";
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
  { group: "Dashboard", label: "Overview", href: "/admin", permission: "dashboard.view" },
  { group: "Storefront", label: "Homepage", href: "/admin/homepage", permission: "homepage.view" },
  { group: "Storefront", label: "Products", href: "/admin/products", permission: "products.view" },
  { group: "Storefront", label: "Shop by brands", href: "/admin/brands", permission: "merchandising.view" },
  { group: "Storefront", label: "Pages & FAQ", href: "/admin/pages", permission: "pages.view" },
  { group: "Storefront", label: "Images", href: "/admin/media", permission: "media.view" },
  { group: "Marketing", label: "Campaigns & collections", href: "/admin/merchandising", permission: "merchandising.view" },
  { group: "Marketing", label: "SEO & search", href: "/admin/seo", permission: "seo.view" },
  { group: "Marketing", label: "Analytics", href: "/admin/analytics", permission: "analytics.view" },
  { group: "Customer operations", label: "Customer care & returns", href: "/admin/customer-service", permission: "support.view" },
  { group: "Customer operations", label: "Reviews", href: "/admin/reviews", permission: "products.view" },
  { group: "Customer operations", label: "Delivery", href: "/admin/delivery", permission: "analytics.view" },
  { group: "Customer operations", label: "Payments", href: "/admin/payments", permission: "analytics.view" },
  { group: "Website settings", label: "Appearance, navigation & footer", href: "/admin/settings", permission: "settings.view" },
  { group: "Administration", label: "Account security", href: "/admin/security", permission: "security.self" },
  { group: "Administration", label: "History & restore", href: "/admin/history", permission: "publishing.view" },
  { group: "Administration", label: "Audit activity", href: "/admin/audit", permission: "audit.view" },
  { group: "Administration", label: "Health & backups", href: "/admin/operations", permission: "health.view" },
];

export async function AdminShell({
  username,
  title,
  subtitle,
  children,
  wide = false,
}: {
  username: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [session, config] = await Promise.all([currentAdmin(), readStorefrontConfig()]);
  const visibleNav = session
    ? nav.filter((item) => hasAdminPermission(session, item.permission))
    : [];

  return (
    <div className={`admin-workspace min-h-screen text-[#2f211f] ${wide ? "admin-workspace--wide" : ""}`}>
      <a href="#admin-content" className="skip-link">Skip to admin content</a>
      <header className="admin-header">
        <Link href="/admin" className="admin-brand flex min-w-0 items-center gap-2.5 font-semibold tracking-tight" aria-label="Aloyri Ecommerce Admin overview">
          <span className="admin-brand-symbol" aria-hidden="true">A</span>
          <span className="flex min-w-0 flex-col leading-tight"><span>Aloyri</span><span className="text-[10px] font-medium uppercase tracking-[.13em] text-[#8c7370]">Store administration</span></span>
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-store-link">View store ↗</Link>
          <span className="hidden text-xs text-black/60 sm:inline">{session?.displayName || username}</span>
          <form action={logoutAdmin}><button type="submit" className="admin-signout">Sign out</button></form>
        </div>
      </header>
      <div className="admin-frame">
        <aside className="admin-sidebar"><AdminNavigation items={visibleNav} /></aside>
        <main id="admin-content" tabIndex={-1} className="admin-main min-w-0">
          <div className="admin-page-heading">
            <p className="admin-page-eyebrow">Owner account</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <AdminEditGuard key={config.updatedAt} version={config.updatedAt} />
          <AdminSectionLinks />
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
