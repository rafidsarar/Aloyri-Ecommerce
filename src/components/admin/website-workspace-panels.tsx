import Link from "next/link";
import { AdminNotice } from "@/components/admin/admin-shell";
import { WebsiteSettingsEditor } from "@/components/admin/website-settings-editor";
import { WebsiteMediaLibrary } from "@/components/admin/website-media-library";
import { WebsiteMerchandisingPanel } from "@/components/admin/website-merchandising-panel";
import { WebsitePageEditor, type EditableWebsitePage } from "@/components/admin/website-page-editor";
import { StorefrontDevicePreview } from "@/components/admin/storefront-device-preview";
import { hasAdminPermission, type AdminSession } from "@/lib/admin-auth";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";
import type { WebsiteWorkspace } from "@/components/admin/website-workspace-navigation";
import { listStorefrontMedia } from "@/lib/storefront-admin-store";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";

export async function WebsiteWorkspacePanels({ workspace, config, admin, media, mediaUnavailable, contentKey, editKind, editId, query }: {
  workspace: Exclude<WebsiteWorkspace, "design">;
  config: StorefrontConfig;
  admin: Pick<AdminSession, "role" | "permissions">;
  mediaUnavailable?: boolean;
  media: Awaited<ReturnType<typeof listStorefrontMedia>>;
  contentKey: EditableWebsitePage;
  editKind?: "campaign" | "collection";
  editId?: string;
  query?: { saved?: string; error?: string };
}) {
  if (workspace === "settings") {
    return <section aria-label="Website settings workspace" className="space-y-5">
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Store settings</h2>
        <p className="mt-1 text-sm text-black/60">Edit the existing website settings here. This form saves independently of unfinished visual designs.</p>
      </div>
      {hasAdminPermission(admin, "settings.edit")
        ? <WebsiteSettingsEditor config={config} inBuilder />
        : <AdminNotice tone="neutral">Your role has view-only access to Website Settings.</AdminNotice>}
      <details className="rounded-xl border border-black/10 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Preview the saved storefront on mobile, tablet or desktop</summary>
        <div className="mt-4"><StorefrontDevicePreview path="/" /></div>
      </details>
    </section>;
  }
  if (workspace === "pages") {
    return <section aria-label="Website content workspace" className="space-y-5">
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Edit pages and FAQ</h2>
        <p className="mt-1 text-sm text-black/60">Use the same page editing form here or in Pages & FAQ. Changes are saved directly; CRM operations are unaffected.</p>
        <nav aria-label="Choose page content" className="mt-4 flex flex-wrap gap-2">
          {(["about", "shipping", "returns", "contact", "faq"] as const).map(key => (
            <Link key={key} href={`/admin/builder?workspace=pages&content=${key}`}
              aria-current={contentKey === key ? "page" : undefined}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${contentKey === key ? "border-[#713a35] bg-[#713a35] text-white" : "border-black/10"}`}>
              {key === "faq" ? "FAQ" : key[0].toUpperCase() + key.slice(1)}
            </Link>
          ))}
        </nav>
      </div>
      {hasAdminPermission(admin, "pages.edit")
        ? <WebsitePageEditor key={contentKey} config={config} page={contentKey} inBuilder />
        : <AdminNotice tone="neutral">Your role has view-only access to website pages.</AdminNotice>}
      <details className="rounded-xl border border-black/10 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Preview the saved public page</summary>
        <div className="mt-4"><StorefrontDevicePreview path={contentKey === "shipping" ? "/shipping-delivery" : contentKey === "returns" ? "/returns-refunds" : `/${contentKey}`} /></div>
      </details>
    </section>;
  }
  if (workspace === "campaigns") {
    const catalog = await fetchCrmCatalog();
    return <section aria-label="Campaigns and collections workspace">
      <WebsiteMerchandisingPanel config={config} catalog={catalog} canEdit={hasAdminPermission(admin, "merchandising.edit")} kind={editKind} id={editId} query={query} />
    </section>;
  }
  return <section aria-label="Website media workspace" className="space-y-4">
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <h2 className="text-lg font-semibold">Media library</h2>
      <p className="mt-1 text-sm text-black/60">Browse real website photography and reuse it from existing banner, product and campaign editors.</p>
      {hasAdminPermission(admin, "products.view") ? <Link className="mt-3 inline-flex rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold" href="/admin/products">Edit product images →</Link> : null}
    </div>
    <WebsiteMediaLibrary media={media} unavailable={mediaUnavailable} canUpload={hasAdminPermission(admin, "media.edit")} />
  </section>;
}
