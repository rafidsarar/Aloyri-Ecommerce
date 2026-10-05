import Image from "next/image";
import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import {
  listStorefrontMedia,
  storefrontMediaUrl,
} from "@/lib/storefront-admin-store";

export default async function AdminMediaPage() {
  const admin = await requireAdminPage();
  const media = await listStorefrontMedia();

  return (
    <AdminShell
      username={admin.username}
      title="Media library"
      subtitle="Product images uploaded from Ecommerce Admin are stored separately from CRM in the private website datastore."
    >
      <AdminCard>
        {media.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {media.map((blob) => (
              <div key={blob.pathname} className="overflow-hidden rounded-xl border border-black/8">
                <div className="aspect-square bg-[#f7f4f2]">
                  <Image
                    src={storefrontMediaUrl(blob.pathname)}
                    alt={blob.pathname}
                    width={500}
                    height={500}
                    className="h-full w-full object-contain p-4"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-medium">{blob.pathname.replace(/^media\//, "")}</p>
                  <p className="mt-1 text-[11px] text-black/40">
                    {(blob.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold">No custom media yet.</p>
            <p className="mt-2 text-xs text-black/45">
              Upload product photography from the Product presentation editor.
            </p>
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
