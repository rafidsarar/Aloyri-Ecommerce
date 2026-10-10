import { AdminShell } from "@/components/admin/admin-shell";
import { WebsiteMediaLibrary } from "@/components/admin/website-media-library";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  listStorefrontMedia,
} from "@/lib/storefront-admin-store";

export default async function AdminMediaPage() {
  const admin = await requireAdminPermission("media.view");
  const media = await listStorefrontMedia();

  return (
    <AdminShell
      username={admin.username}
      title="Media library"
      subtitle="Product images uploaded from Ecommerce Admin are stored separately from CRM in the private website datastore."
    >
      <WebsiteMediaLibrary media={media} />
    </AdminShell>
  );
}
