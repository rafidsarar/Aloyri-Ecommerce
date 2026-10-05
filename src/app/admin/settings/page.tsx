import { saveSiteSettings, updateAdminPassword } from "@/app/admin/actions";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; passwordChanged?: string; passwordError?: string }>;
}) {
  const admin = await requireAdminPage();
  const [query, config] = await Promise.all([
    searchParams,
    readStorefrontConfig(),
  ]);

  return (
    <AdminShell
      username={admin.username}
      title="Store settings"
      subtitle="Customer-facing website settings live here. Commerce-critical price, stock and order controls remain in CRM."
    >
      {query.saved ? <AdminNotice>Store settings saved.</AdminNotice> : null}\n      {query.passwordChanged ? <AdminNotice>Admin password changed and session keys rotated.</AdminNotice> : null}\n      {query.passwordError ? <AdminNotice tone="warning">{query.passwordError}</AdminNotice> : null}

      <form action={saveSiteSettings} className="grid gap-5">
        <AdminCard>
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
        </AdminCard>

        <AdminCard>
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
        </AdminCard>

        <AdminNotice tone="neutral">
          Delivery pricing, ordering enable/disable state and payment method availability are still operational settings tied to the CRM/order bridge and are intentionally not editable here.
        </AdminNotice>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save settings
          </button>
        </div>
      </form>

      <form action={updateAdminPassword} className="mt-5">
        <AdminCard>
          <p className="text-sm font-semibold">Admin account security</p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            Changing the password also rotates the admin session signing key.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              New password
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Confirm new password
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
          </div>
          <button className="mt-4 rounded-xl border border-[#713a35]/18 px-5 py-3 text-sm font-semibold text-[#713a35]">
            Change admin password
          </button>
        </AdminCard>
      </form>
    </AdminShell>
  );
}
