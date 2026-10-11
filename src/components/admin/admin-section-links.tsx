"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const settings = [
  ["Website settings", "/admin/settings"], ["SEO", "/admin/seo"],
  ["Security", "/admin/security"], ["History & restore", "/admin/history"],
  ["Activity", "/admin/audit"], ["Health & backups", "/admin/operations"],
] as const;
const service = [
  ["Support & returns", "/admin/customer-service"], ["Reviews", "/admin/reviews"],
  ["Delivery", "/admin/delivery"], ["Payments", "/admin/payments"],
] as const;
const website = [
  ["Homepage", "/admin/builder"], ["Pages & FAQ", "/admin/pages"],
  ["Images", "/admin/media"],
] as const;

export function AdminSectionLinks() {
  const pathname = usePathname();
  const items = settings.some(([, href]) => pathname === href || pathname.startsWith(href + "/")) ? settings
    : service.some(([, href]) => pathname === href || pathname.startsWith(href + "/")) ? service
    : pathname.startsWith("/admin/pages") || pathname === "/admin/media" ? website : null;
  if (!items) return null;
  return <nav aria-label="Related store tools" className="mb-6 flex flex-wrap gap-2">
    {items.map(([label, href]) => <Link key={href} href={href}
      aria-current={pathname === href || pathname.startsWith(href + "/") ? "page" : undefined}
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${pathname === href || pathname.startsWith(href + "/") ? "border-[#713a35] bg-[#713a35] text-white" : "border-black/10 bg-white hover:bg-[#fff7f3]"}`}>{label}</Link>)}
  </nav>;
}
