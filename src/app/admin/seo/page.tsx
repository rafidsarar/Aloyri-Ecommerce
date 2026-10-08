import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { analyzeSeoHealth } from "@/lib/seo-manager";
import {
  applyStorefrontEditorial,
  getPublishingStatus,
  readDraftStorefrontConfig,
} from "@/lib/storefront-admin-store";

export default async function SeoManagerPage() {
  const admin = await requireAdminPermission("seo.view");
  const [config, catalog, publishing] = await Promise.all([
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
    getPublishingStatus(),
  ]);
  const products = catalog.ok
    ? applyStorefrontEditorial(catalog.body.products, config)
    : [];
  const report = analyzeSeoHealth(config, products);

  return (
    <AdminShell
      username={admin.username}
      title="SEO & Discoverability"
      subtitle="Manage search metadata, social previews, indexing, canonicals, structured product discovery and redirects through the automatic live-save workflow."
    >
      {publishing.hasDraftChanges ? (
        <AdminNotice tone="warning">
          SEO changes update the live website when saved.
        </AdminNotice>
      ) : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so product-specific SEO health is temporarily incomplete.
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            SEO health
          </p>
          <p className="mt-3 text-4xl font-semibold">{report.score}</p>
          <p className="mt-1 text-xs text-black/42">out of 100</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Errors
          </p>
          <p className="mt-3 text-4xl font-semibold">{report.errors}</p>
          <p className="mt-1 text-xs text-black/42">should be reviewed before saving</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Warnings
          </p>
          <p className="mt-3 text-4xl font-semibold">{report.warnings}</p>
          <p className="mt-1 text-xs text-black/42">optimization opportunities</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Redirects
          </p>
          <p className="mt-3 text-4xl font-semibold">
            {config.seo.redirects.filter((item) => item.active).length}
          </p>
          <p className="mt-1 text-xs text-black/42">active website redirects</p>
        </AdminCard>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          ["Pages & categories", "Titles, descriptions, canonicals, indexing and social previews.", "/admin/seo/pages"],
          ["Products", "Product metadata and search/social presentation with CRM-safe fallbacks.", "/admin/seo/products"],
          ["Redirects", "Versioned internal 307/308 redirects with loop and protected-route safeguards.", "/admin/seo/redirects"],
        ].map(([title, copy, href]) => (
          <Link key={href} href={href}>
            <AdminCard className="h-full transition hover:border-[#713a35]/20">
              <p className="text-base font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-6 text-black/48">{copy}</p>
            </AdminCard>
          </Link>
        ))}
      </div>

      <AdminCard className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">SEO health checks</p>
            <p className="mt-1 text-xs leading-5 text-black/45">
              Checks titles, descriptions, canonicals, duplicate metadata, social images and redirect integrity.
            </p>
          </div>
          <Link
            href="/admin/history"
            className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
          >
            Open Version History
          </Link>
        </div>

        {report.issues.length ? (
          <div className="mt-5 divide-y divide-black/7">
            {report.issues.slice(0, 40).map((issue) => (
              <Link
                key={issue.id}
                href={issue.href}
                className="grid gap-2 py-3 md:grid-cols-[110px_220px_1fr] md:items-center"
              >
                <span
                  className={
                    issue.severity === "error"
                      ? "w-fit rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-red-700"
                      : "w-fit rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-amber-700"
                  }
                >
                  {issue.severity}
                </span>
                <span className="text-sm font-medium">{issue.label}</span>
                <span className="text-sm text-black/50">{issue.message}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-emerald-700">
            No SEO health issues detected in the live storefront.
          </p>
        )}
      </AdminCard>
    </AdminShell>
  );
}
