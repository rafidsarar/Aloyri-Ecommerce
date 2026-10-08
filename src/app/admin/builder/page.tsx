import Link from "next/link";
import { AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { VisualBuilderStudio } from "@/components/admin/visual-builder-studio";
import { requireAdminPermission } from "@/lib/admin-auth";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";
import { visualPageKeys, visualPageNames, type VisualPageKey } from "@/lib/visual-builder";

export default async function VisualBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; page?: string }>;
}) {
  const admin = await requireAdminPermission("homepage.view");
  const [config, query] = await Promise.all([readDraftStorefrontConfig(), searchParams]);
  const pageKey = query.page === "home" || !query.page ? "home" : visualPageKeys.includes(query.page as VisualPageKey) ? query.page as VisualPageKey : "home";
  const layout = pageKey === "home" ? config.homepage.visualLayout : config.visualPages[pageKey];
  return (
    <AdminShell
      username={admin.username}
      title="Aloyri Visual Builder"
      subtitle="Design and arrange your storefront homepage with reusable, safe components and a visual editor."
    >
      {query.saved ? <AdminNotice>Visual design saved to the live homepage. <Link href="/" target="_blank" className="underline">Open website ↗</Link></AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">The design could not be saved. Check its content and try again.</AdminNotice> : null}
      <div className="mb-5 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.13em] text-[#713a35]">Website design studio</p>
          <h2 className="mt-2 text-lg font-semibold">Build visually, keep commerce reliable.</h2>
          <p className="mt-1 text-sm leading-6 text-black/60">Drag existing storefront sections into a new order. Add custom image, text, call-to-action, feature, FAQ and testimonial-style blocks. Save to publish instantly, or restore an earlier version.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/homepage" className="inline-flex min-h-11 items-center rounded-xl border border-[#713a35]/20 px-4 py-2 text-xs font-semibold text-[#713a35]">Homepage settings →</Link>
          <Link href="/admin/media" className="inline-flex min-h-11 items-center rounded-xl border border-[#713a35]/20 px-4 py-2 text-xs font-semibold text-[#713a35]">Media library →</Link>
        </div>
      </div>
      <nav aria-label="Choose page template" className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-black/10 bg-white p-4">
        {([{ key: "home", label: "Homepage" }, ...visualPageKeys.map(key => ({ key, label: visualPageNames[key] }))] as const).map(item => <Link key={item.key} href={"/admin/builder?page=" + item.key} aria-current={pageKey === item.key ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-xs font-semibold ${pageKey === item.key ? "border-[#713a35] bg-[#713a35] text-white" : "border-black/15 bg-[#fffaf8] text-[#713a35]"}`}>{item.label}</Link>)}
      </nav>
      <VisualBuilderStudio key={pageKey} pageKey={pageKey} initialLayout={layout} />
    </AdminShell>
  );
}
