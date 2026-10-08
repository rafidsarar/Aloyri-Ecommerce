import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin-auth";
import { StorefrontDevicePreview } from "@/components/admin/storefront-device-preview";
import { AdminCard, AdminShell } from "@/components/admin/admin-shell";

export default async function DevicePreviewPage() {
  const admin = await requireAdminPermission("homepage.view");
  return <AdminShell username={admin.username} title="Responsive storefront preview" subtitle="Inspect your live storefront at mobile, tablet and desktop widths.">
    <AdminCard>
      <StorefrontDevicePreview />
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/admin/homepage" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">Edit homepage</Link>
        <Link href="/admin/history" className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold">Version history</Link>
      </div>
    </AdminCard>
  </AdminShell>;
}
