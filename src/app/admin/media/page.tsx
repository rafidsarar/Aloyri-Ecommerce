import { AdminShell, AdminNotice } from "@/components/admin/admin-shell";
import { WebsiteMediaLibrary } from "@/components/admin/website-media-library";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  readStorefrontMediaLibrary,
} from "@/lib/storefront-admin-store";

export default async function AdminMediaPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string;warning?:string}>}) {
  const admin = await requireAdminPermission("media.view");
  const [{media,unavailable},query]=await Promise.all([readStorefrontMediaLibrary(),searchParams]);

  return (
    <AdminShell
      username={admin.username}
      title="Images"
      subtitle="Upload photos and choose them in your homepage, product and campaign forms."
    >
      {query.saved && <AdminNotice>Image uploaded.</AdminNotice>}
      {query.error && <AdminNotice tone="warning">{query.error}</AdminNotice>}
      {query.warning && <AdminNotice tone="warning">The image was uploaded, but its activity record could not be saved.</AdminNotice>}
      <WebsiteMediaLibrary media={media} unavailable={unavailable} canUpload />
    </AdminShell>
  );
}
