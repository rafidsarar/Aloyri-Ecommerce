import Link from "next/link";
import { AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { VisualBuilderStudio } from "@/components/admin/visual-builder-studio";
import { HomepageAdvancedControls } from "@/components/admin/homepage-advanced-controls";
import { hasAdminPermission, requireAdminPermission } from "@/lib/admin-auth";
import { listStorefrontMedia, readDraftStorefrontConfig } from "@/lib/storefront-admin-store";
import { visualPageKeys, visualPageNames, type VisualPageKey } from "@/lib/visual-builder";

export default async function VisualBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; page?: string; view?: string }>;
}) {
  const admin = await requireAdminPermission("homepage.view");
  const [config, query, media] = await Promise.all([readDraftStorefrontConfig(), searchParams, listStorefrontMedia()]);
  const pageKey = query.page === "home" || !query.page ? "home" : visualPageKeys.includes(query.page as VisualPageKey) ? query.page as VisualPageKey : "home";
  const layout = pageKey === "home" ? config.homepage.visualLayout : config.visualPages[pageKey];
  return (
    <AdminShell
      username={admin.username}
      title="Aloyri Storefront Builder"
      subtitle="Edit existing homepage features, design new sections and manage page layouts in one workspace."
      wide
    >
      {query.saved ? <AdminNotice>Storefront changes saved to the live website. <Link href="/" target="_blank" className="underline">Open website ↗</Link></AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">The design could not be saved. Check its content and try again.</AdminNotice> : null}
      <div className="mb-4 grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.13em] text-[#713a35]">Website design studio</p>
          <h2 className="mt-1 text-base font-semibold sm:text-lg">Edit the storefront in one place.</h2>
          <p className="mt-1 text-sm leading-6 text-black/60">Edit existing banners, product discovery, section visibility, layout, promotions, editorial copy and styling alongside drag-and-drop components. All homepage changes share one save action and version history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/builder?page=home&view=advanced" className="inline-flex min-h-11 items-center rounded-xl border border-[#713a35]/20 px-4 py-2 text-xs font-semibold text-[#713a35]">Existing homepage features →</Link>
          <Link href="/admin/media" className="inline-flex min-h-11 items-center rounded-xl border border-[#713a35]/20 px-4 py-2 text-xs font-semibold text-[#713a35]">Media library →</Link>
        </div>
      </div>
      <section aria-label="Website management" className="mb-5 rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Website control center</h2>
          <p className="mt-1 text-sm text-black/60">Choose what to manage. Existing editing tools remain available with their own save actions and access permissions.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {([
            ["Homepage & banners", "Hero sliders, featured products, 5% offers and homepage sections", "/admin/builder?page=home&view=advanced", "homepage.view"],
            ["Header, footer & store settings", "Navigation, colors, announcements and support details", "/admin/settings", "settings.view"],
            ["Products & photography", "Website product content, images and product presentation", "/admin/products", "products.view"],
            ["Pages & policies", "About, contact, shipping, returns and FAQ", "/admin/pages", "pages.view"],
            ["Campaigns & collections", "Merchandising, featured collections and promotional campaigns", "/admin/merchandising", "merchandising.view"],
            ["SEO & discoverability", "Metadata, redirects and search presentation", "/admin/seo", "seo.view"],
            ["Media library", "Manage reusable website images and assets", "/admin/media", "homepage.view"],
            ["Analytics", "Visitor and conversion insights", "/admin/analytics", "analytics.view"],
            ["Customer service", "Customer inquiries and return requests", "/admin/customer-service", "support.view"],
            ["Orders & delivery", "Website fulfillment and courier operations", "/admin/delivery", "analytics.view"],
            ["Payments & refunds", "COD settlement and refund visibility", "/admin/payments", "analytics.view"],
            ["Versions & recovery", "History and restore of website changes", "/admin/history", "publishing.view"],
            ["Operational health", "Website health and backups", "/admin/operations", "health.view"],
          ] as const).filter(([, , , permission]) => hasAdminPermission(admin, permission)).map(([name, detail, href]) => (
            <Link key={href} href={href} className="group rounded-xl border border-black/10 bg-[#fffaf8] p-4 transition hover:border-[#713a35]/40 hover:bg-[#fff2ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#713a35]">
              <span className="block text-sm font-semibold text-[#432824]">{name} <span aria-hidden="true" className="float-right transition group-hover:translate-x-1">→</span></span>
              <span className="mt-2 block text-xs leading-5 text-black/60">{detail}</span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-black/50">CRM remains the source of truth for inventory, prices and order accounting. Staff only see tools permitted for their role.</p>
      </section>
      <nav aria-label="Choose page template" className="mb-4 flex flex-nowrap gap-2 overflow-x-auto rounded-2xl border border-black/10 bg-white p-3">
        {([{ key: "home", label: "Homepage" }, ...visualPageKeys.map(key => ({ key, label: visualPageNames[key] }))] as const).map(item => <Link key={item.key} href={"/admin/builder?page=" + item.key} aria-current={pageKey === item.key ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 py-2 text-xs font-semibold ${pageKey === item.key ? "border-[#713a35] bg-[#713a35] text-white" : "border-black/15 bg-[#fffaf8] text-[#713a35]"}`}>{item.label}</Link>)}
      </nav>
      {pageKey !== "home" && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div><p className="text-sm font-semibold">Existing page content and site navigation</p><p className="mt-1 text-xs text-black/60">Manage existing page text and structure without changing product, order or checkout functionality.</p></div>
        <div className="flex flex-wrap gap-2">
          {["about", "shipping", "returns", "contact", "faq"].includes(pageKey) && <Link href={`/admin/pages/${pageKey}`} className="inline-flex min-h-10 items-center rounded-xl border border-black/15 px-3 py-2 text-xs font-semibold">Edit existing page content ↗</Link>}
          <Link href="/admin/settings" className="inline-flex min-h-10 items-center rounded-xl border border-black/15 px-3 py-2 text-xs font-semibold">Header, footer & appearance ↗</Link>
          <Link href="/admin/merchandising" className="inline-flex min-h-10 items-center rounded-xl border border-black/15 px-3 py-2 text-xs font-semibold">Collections & campaigns ↗</Link>
        </div>
      </div>}
      <VisualBuilderStudio key={pageKey} pageKey={pageKey} initialLayout={layout} initialSiteContent={{ announcement: config.site.announcement, footerDescription: config.site.footerDescription }} initialPageContent={pageKey === "about" || pageKey === "shipping" || pageKey === "returns" || pageKey === "contact" ? config.pages[pageKey] : undefined} mediaPaths={media.slice(0, 150).map(item => item.pathname)} initialCoreContent={pageKey === "home" ? { eyebrow: config.homepage.eyebrow, headline: config.homepage.headline, intro: config.homepage.intro, primaryLabel: config.homepage.primaryLabel, primaryHref: config.homepage.primaryHref, secondaryLabel: config.homepage.secondaryLabel, secondaryHref: config.homepage.secondaryHref, heroImagePath: config.homepage.heroImagePath, heroStyle: config.homepage.heroStyle, heroAlignment: config.homepage.heroAlignment, heroLayout: config.homepage.heroLayout, browseEyebrow: config.homepage.browseEyebrow, browseTitle: config.homepage.browseTitle, browseIntro: config.homepage.browseIntro, browsePlaceholder: config.homepage.browsePlaceholder, categoriesEyebrow: config.homepage.categoriesEyebrow, categoriesTitle: config.homepage.categoriesTitle, categoriesIntro: config.homepage.categoriesIntro, routineFinderHeadline: config.homepage.routineFinderHeadline, routineFinderIntro: config.homepage.routineFinderIntro, ideaEyebrow: config.homepage.ideaEyebrow, ideaHeadline: config.homepage.ideaHeadline, ideaCopy: config.homepage.ideaCopy } : undefined} initialView={pageKey === "home" && query.view === "advanced" ? "advanced" : "canvas"} advancedSettings={pageKey === "home" ? <HomepageAdvancedControls config={config} /> : undefined} />
    </AdminShell>
  );
}
