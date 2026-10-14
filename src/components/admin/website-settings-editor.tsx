import { StorefrontLayoutFields } from "@/components/admin/storefront-layout-fields";
import { SOCIAL_PLATFORMS } from "@/lib/social-links";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { saveSiteSettings } from "@/app/admin/actions";
import { AdminCard, AdminNotice } from "@/components/admin/admin-shell";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

/**
 * Identical settings form in /admin/settings and the unified Builder.
 * The existing server action remains the only write path and enforces settings.edit.
 */
export function WebsiteSettingsEditor({ config, inBuilder = false }: { config: StorefrontConfig; inBuilder?: boolean }) {
  return (
    <div className="space-y-5">
      <form key={config.updatedAt} action={saveSiteSettings} className="grid gap-5">
        <input type="hidden" name="storefrontVersion" value={config.updatedAt}/>
        {inBuilder ? <input type="hidden" name="builderWorkspace" value="settings" /> : null}
        <WebsiteSettingsFields config={config} />
        <AdminNotice tone="neutral">
          Delivery prices, payment methods and order availability are managed in CRM.
        </AdminNotice>

        <div className="admin-save-bar"><p className="text-xs text-black/60">Saving updates the live storefront. You can restore an earlier version from Version History.</p><AdminSubmitButton pendingLabel="Saving…">Save changes</AdminSubmitButton></div>
      </form>

    </div>
  );
}

/** Fields only, for the visual editor’s atomic save form. */
export function WebsiteSettingsFields({config, homepage = false}: {config: StorefrontConfig; homepage?: boolean}) {
  return <div className="space-y-4">
        <details id="website-layout" name="website-setting" className="admin-editor-section"><summary>Header, navigation & product layout</summary><div className="p-5"><StorefrontLayoutFields value={config.presentation} headerOnly={homepage} /></div></details>
        {!homepage && <details id="website-appearance" name="website-setting" className="admin-editor-section"><summary>Color theme</summary><AdminCard>
          <h2 className="mb-3 text-sm font-semibold">Storefront appearance</h2>
          <p className="mb-4 text-xs text-black/60">Choose a color theme. Save to update your live website.</p>
          <label className="grid gap-2 text-sm font-medium">Color theme
            <select name="appearance" defaultValue={config.site.appearance} className="rounded-xl border border-black/10 px-4 py-3">
              <option value="rose">Rose — Aloyri classic</option>
              <option value="sage">Sage — natural green</option>
              <option value="sand">Sand — warm neutral</option>
            </select>
          </label>
        </AdminCard></details>}
        <details id="website-content" name="website-setting" className="admin-editor-section" open><summary>Announcement & footer</summary><AdminCard>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Announcement bar
              <input name="announcement" defaultValue={config.site.announcement} maxLength={180} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Footer description
              <textarea name="footerDescription" defaultValue={config.site.footerDescription} rows={4} maxLength={600} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard></details>

        {!homepage && <details id="website-social" name="website-setting" className="admin-editor-section"><summary>Social media</summary><AdminCard>
          <h2 className="text-sm font-semibold">Social profile links</h2>
          <p className="mt-1 text-xs leading-5 text-black/55">
            Enter the full HTTPS URL for each profile. Saved links appear automatically as icons in the website footer; empty fields remain hidden.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {SOCIAL_PLATFORMS.map(platform => (
              <label key={platform.key} className="grid min-w-0 gap-1.5 text-sm font-medium">
                {platform.label} profile URL
                <input
                  name={"social_" + platform.key}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder={"https://" + platform.hosts[0] + "/"}
                  defaultValue={config.site.socialLinks?.[platform.key] || ""}
                  maxLength={400}
                  className="w-full min-w-0 rounded-xl border border-black/10 px-4 py-3 text-sm font-normal"
                />
              </label>
            ))}
          </div>
        </AdminCard></details>}

        <details id="website-support" name="website-setting" className="admin-editor-section"><summary>Customer contact</summary><AdminCard>
          <p className="text-sm font-semibold">Customer support details</p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            Leave fields blank until you want them shown publicly.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Support email
              <input name="supportEmail" type="email" defaultValue={config.site.supportEmail} maxLength={200} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Support phone
              <input name="supportPhone" defaultValue={config.site.supportPhone} maxLength={80} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
              Support hours / availability note
              <input name="supportHours" defaultValue={config.site.supportHours} maxLength={200} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard></details>

  </div>;
}
