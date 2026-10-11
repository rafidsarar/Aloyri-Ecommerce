import Link from "next/link";
import { saveVisualBuilder } from "@/app/admin/actions";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { HomepageAdvancedControls } from "@/components/admin/homepage-advanced-controls";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

export function SimpleHomepageEditor({ config }: { config: StorefrontConfig }) {
  return <form key={config.updatedAt} action={saveVisualBuilder} className="space-y-5">
    <input type="hidden" name="pageKey" value="home" />
    <input type="hidden" name="layout" value={JSON.stringify(config.homepage.visualLayout)} />
    <input type="hidden" name="homepageControls" value="1" />
    <input type="hidden" name="storefrontVersion" value={config.updatedAt} />
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Homepage</h2>
      <p className="mt-1 text-sm text-black/60">Open a section to change its text, images or display options. Save when you’re ready.</p>
    </div>
    <HomepageAdvancedControls config={config} />
    <div className="admin-save-bar">
      <span className="text-sm text-black/60">Saving updates your live homepage.</span>
      <AdminSubmitButton>Save homepage</AdminSubmitButton>
    </div>
    <details className="rounded-xl border border-black/10 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold">Advanced page layouts</summary>
      <p className="mt-3 text-sm text-black/60">Add custom content blocks or adjust individual page templates.</p>
      <Link href="/admin/builder?view=layout" className="mt-3 inline-flex rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold">Open layout editor →</Link>
    </details>
  </form>;
}
