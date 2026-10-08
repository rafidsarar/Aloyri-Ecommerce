import Link from "next/link";
import { draftMode } from "next/headers";
import { requireAdminPermission } from "@/lib/admin-auth";
import { StorefrontDevicePreview } from "@/components/admin/storefront-device-preview";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";

export default async function DevicePreviewPage() {
  const admin = await requireAdminPermission("publishing.preview");
  const draft = await draftMode();
  return <AdminShell username={admin.username} title="Responsive storefront preview" subtitle="Inspect your unpublished homepage at real mobile, tablet and desktop viewport widths.">
    {!draft.isEnabled ? <AdminNotice tone="warning">Draft preview is not enabled. Open Publishing and select Preview at device sizes first.</AdminNotice> : null}
    <AdminCard>
      <StorefrontDevicePreview />
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/admin/homepage" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">Edit homepage</Link>
        <Link href="/admin/publishing" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">Publishing & history</Link>
      </div>
    </AdminCard>
  </AdminShell>;
}
