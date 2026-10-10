import Link from "next/link";
import { StorefrontLayoutFields } from "@/components/admin/storefront-layout-fields";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { saveSiteSettings } from "@/app/admin/actions";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("settings.view");
  const [{ saved, error }, config] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
  ]);

  return (
    <AdminShell
      username={admin.username}
      title="Website settings"
      subtitle="Clear, grouped controls for your website identity, appearance, footer and customer contact information."
    >
      {saved ? <AdminNotice>Changes saved live. <Link href="/admin/history" className="underline">Version history →</Link></AdminNotice> : null}
      {error ? <AdminNotice tone="neutral">{error}</AdminNotice> : null}

      <div className="mb-5 rounded-2xl border border-[#713a35]/15 bg-[#fff7f3] p-5">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#713a35]">Storefront control center</p>
        <h2 className="mt-2 text-lg font-semibold">Manage your website from the Storefront Builder</h2>
        <p className="mt-2 text-sm leading-6 text-black/60">These website-wide settings use their own Save button so changes to your header, footer and contact details never overwrite an unfinished homepage design.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/builder?page=home" className="rounded-xl bg-[#713a35] px-4 py-3 text-sm font-semibold text-white">Open Storefront Builder →</Link>
          <Link href="/admin/builder?page=home&view=advanced" className="rounded-xl border border-[#713a35]/20 px-4 py-3 text-sm font-semibold text-[#713a35]">Homepage banners & offers →</Link>
        </div>
      </div>
      <nav aria-label="Website settings sections" className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
        <a href="#website-layout" className="rounded-full border border-black/10 px-3 py-2">Header & navigation</a>
        <a href="#website-appearance" className="rounded-full border border-black/10 px-3 py-2">Colors & typography</a>
        <a href="#website-content" className="rounded-full border border-black/10 px-3 py-2">Announcement & footer</a>
        <a href="#website-support" className="rounded-full border border-black/10 px-3 py-2">Customer contact</a>
      </nav>
      <form action={saveSiteSettings} className="grid gap-5">
        <div id="website-layout"><StorefrontLayoutFields value={config.presentation} /></div>
        <div id="website-appearance"><AdminCard>
          <h2 className="mb-3 text-sm font-semibold">Storefront appearance</h2>
          <p className="mb-4 text-xs text-black/60">Choose a color theme. Save to update your live website.</p>
          <label className="grid gap-2 text-sm font-medium">Color theme
            <select name="appearance" defaultValue={config.site.appearance} className="rounded-xl border border-black/10 px-4 py-3">
              <option value="rose">Rose — Aloyri classic</option>
              <option value="sage">Sage — natural green</option>
              <option value="sand">Sand — warm neutral</option>
            </select>
          </label>
        </AdminCard></div>
        <div id="website-content"><AdminCard>
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
        </AdminCard></div>

        <div id="website-support"><AdminCard>
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
        </AdminCard></div>

        <AdminNotice tone="neutral">
          Delivery pricing, ordering enable/disable state and payment method availability are still operational settings tied to the CRM/order bridge and are intentionally not editable here.
        </AdminNotice>

        <div className="admin-save-bar"><p className="text-xs text-black/60">Saving updates the live storefront. You can restore an earlier version from Version History.</p><AdminSubmitButton pendingLabel="Saving…">Save changes</AdminSubmitButton></div>
      </form>
    </AdminShell>
  );
}
