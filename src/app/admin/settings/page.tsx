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

      <WebsiteSettingsEditor config={config} />
    </AdminShell>
  );
}
