import Link from "next/link";
import { AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { WebsiteSettingsEditor } from "@/components/admin/website-settings-editor";
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
      <WebsiteSettingsEditor config={config} />
    </AdminShell>
  );
}
