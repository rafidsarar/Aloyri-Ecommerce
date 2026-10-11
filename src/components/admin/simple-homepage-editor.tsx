import { saveVisualBuilder } from "@/app/admin/actions";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { HomepageProductProperties } from "@/components/admin/homepage-product-properties";
import { HomepageAdvancedControls } from "@/components/admin/homepage-advanced-controls";
import { AdditionalContentEditor } from "@/components/admin/additional-content-editor";
import { readStorefrontMediaLibrary } from "@/lib/storefront-admin-store";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

export async function SimpleHomepageEditor({ config }: { config: StorefrontConfig }) {
  const {media}=await readStorefrontMediaLibrary();
  return <form key={config.updatedAt} action={saveVisualBuilder} className="space-y-5">
    <input type="hidden" name="homepageEditor" value="1" />
    <input type="hidden" name="pageKey" value="home" />
    <input type="hidden" name="homepageControls" value="1" />
    <input type="hidden" name="storefrontVersion" value={config.updatedAt} />
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Homepage content</h2>
      <p className="mt-1 text-sm text-black/60">Open a section to change its text, images or display options. Save when you’re ready.</p>
    </div>
    <HomepageAdvancedControls config={config} />
    <HomepageProductProperties config={config} />
    <AdditionalContentEditor initialLayout={config.homepage.visualLayout} mediaPaths={media.map(item=>item.pathname)} />
    <div className="admin-save-bar">
      <span className="text-sm text-black/60">Saving updates your live homepage.</span>
      <AdminSubmitButton>Save homepage</AdminSubmitButton>
    </div>

  </form>;
}
