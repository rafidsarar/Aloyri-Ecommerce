import Link from "next/link";
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
}> = [
  { label: "Overview", href: "/admin", permission: "dashboard.view" },
  { label: "Homepage", href: "/admin/homepage", permission: "homepage.view" },
  { label: "Products", href: "/admin/products", permission: "products.view" },
  { label: "Reviews", href: "/admin/reviews", permission: "products.view" },
  { label: "Pages & FAQ", href: "/admin/pages", permission: "pages.view" },
  { label: "Media", href: "/admin/media", permission: "media.view" },
  { label: "Merchandising", href: "/admin/merchandising", permission: "merchandising.view" },
  { label: "Analytics", href: "/admin/analytics", permission: "analytics.view" },
  { label: "SEO", href: "/admin/seo", permission: "seo.view" },
  { label: "Publishing", href: "/admin/publishing", permission: "publishing.view" },
  { label: "Team", href: "/admin/staff", permission: "staff.view" },
  { label: "Audit", href: "/admin/audit", permission: "audit.view" },
  { label: "Operations", href: "/admin/operations", permission: "health.view" },
  { label: "Security", href: "/admin/security", permission: "security.self" },
  { label: "Settings", href: "/admin/settings", permission: "settings.view" },
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
    <div className="min-h-screen bg-[#f7f4f2] text-[#2f211f]">
      <div className="border-b border-black/8 bg-[#2f211f] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <div>
            <Link href="/admin" className="text-lg font-semibold tracking-tight">
              Aloyri Ecommerce Admin
            </Link>
            <p className="mt-0.5 text-xs text-white/55">
              Storefront operations · CRM remains commerce authority
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/65 sm:inline">
              {session?.displayName || username}
              {session?.role ? " · " + session.role : ""}
            </span>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#2f211f]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[235px_1fr]">
        <aside className="border-b border-black/8 bg-white px-4 py-4 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Admin navigation">
            {visibleNav.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-[#2f211f]/68 transition hover:bg-[#f2e8e4] hover:text-[#713a35]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-7 hidden rounded-2xl border border-[#713a35]/10 bg-[#fff8f5] p-4 lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/55">
              CRM boundary
            </p>
            <p className="mt-2 text-xs leading-5 text-[#2f211f]/58">
              Price, stock and order workflow remain locked to Aloyri CRM.
              Website content and presentation are managed here.
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-7 lg:px-8 lg:py-9">
          <div className="mb-7">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#2f211f]/55">
              {subtitle}
            </p>
          </div>
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
    <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${classes}`}>
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
      className={`rounded-2xl border border-black/8 bg-white p-5 shadow-[0_12px_40px_rgba(50,31,28,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}
