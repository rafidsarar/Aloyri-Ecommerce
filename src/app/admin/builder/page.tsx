import Link from "next/link";
import { AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { VisualBuilderStudio } from "@/components/admin/visual-builder-studio";
import { WebsiteWorkspaceNavigation, type WebsiteWorkspace } from "@/components/admin/website-workspace-navigation";
import { WebsiteWorkspacePanels } from "@/components/admin/website-workspace-panels";
import type { EditableWebsitePage } from "@/components/admin/website-page-editor";
import { HomepageAdvancedControls } from "@/components/admin/homepage-advanced-controls";
import { requireAdminPermission, type AdminPermission } from "@/lib/admin-auth";
import { listStorefrontMedia, readDraftStorefrontConfig } from "@/lib/storefront-admin-store";
import { visualPageKeys, visualPageNames, type VisualPageKey } from "@/lib/visual-builder";

export default async function VisualBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string; page?: string; view?: string; workspace?: string; content?: string; kind?: string; id?: string }>;
}) {
  const query = await searchParams;
  const workspaceOptions: WebsiteWorkspace[] = ["design", "settings", "pages", "campaigns", "media"];
  const requested = workspaceOptions.includes(query.workspace as WebsiteWorkspace)
    ? query.workspace as WebsiteWorkspace : "design";
  const workspacePermissions: Record<WebsiteWorkspace, AdminPermission> = {
    design: "homepage.view",
    settings: "settings.view",
    pages: "pages.view",
    campaigns: "merchandising.view",
    media: "media.view",
  };
  // Authorize the selected workspace before loading any page or media records.
  const admin = await requireAdminPermission(workspacePermissions[requested]);
  const [config, media] = await Promise.all([readDraftStorefrontConfig(), listStorefrontMedia()]);
  const workspace = requested;
  const contentOptions: EditableWebsitePage[] = ["about", "shipping", "returns", "contact", "faq"];
  const contentKey = contentOptions.includes(query.content as EditableWebsitePage)
    ? query.content as EditableWebsitePage : "about";
  const pageKey = query.page === "home" || !query.page ? "home" : visualPageKeys.includes(query.page as VisualPageKey) ? query.page as VisualPageKey : "home";
  const layout = pageKey === "home" ? config.homepage.visualLayout : config.visualPages[pageKey];
  return (
    <AdminShell
      username={admin.username}
      title="Aloyri Storefront Builder"
      subtitle="Edit storefront design, settings, pages, campaigns and media in a consistent, permission-aware workspace."
      wide
    >
      {query.saved ? <AdminNotice>{workspace === "campaigns" ? "Campaign or collection saved." : "Website changes saved."} <Link href="/" target="_blank" rel="noopener noreferrer" className="underline">Open website ↗</Link></AdminNotice> : null}
      {query.deleted ? <AdminNotice>Campaign or collection deleted successfully.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">The design could not be saved. Check its content and try again.</AdminNotice> : null}
      <WebsiteWorkspaceNavigation admin={admin} selected={workspace} />
      {workspace === "design" ? <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4">
        <div><h2 className="text-sm font-semibold">Design the existing storefront</h2><p className="mt-1 text-xs text-black/60">Use the real, device-sized preview and edit live homepage features with one design save.</p></div>
        <Link href="/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold">View live website ↗</Link>
      </div>
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
      </> : <WebsiteWorkspacePanels workspace={workspace} config={config} admin={admin} media={media} contentKey={contentKey} editKind={query.kind === "campaign" || query.kind === "collection" ? query.kind : undefined} editId={query.id} query={query} />}
    </AdminShell>
  );
}
