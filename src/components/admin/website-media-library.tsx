import Image from "next/image";
import { uploadBuilderMedia } from "@/app/admin/actions";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminCard } from "@/components/admin/admin-shell";
import { listStorefrontMedia, storefrontMediaUrl } from "@/lib/storefront-admin-store";

type Media = Awaited<ReturnType<typeof listStorefrontMedia>>;

/** Shared, read-only media browser. Uploads remain in authorized editors. */
export function WebsiteMediaLibrary({ media, unavailable = false, canUpload = false }: { media: Media; unavailable?: boolean; canUpload?: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-black/60">Use the same media library across Banner, Product and Campaign editors. Uploads here do not modify CRM images or inventory.</p>
      {canUpload ? <form action={uploadBuilderMedia} className="flex flex-wrap items-end gap-3 rounded-xl border border-black/10 bg-white p-4">
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-semibold">
          Add an image (JPG, PNG or WebP; up to 5 MB)
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required
            className="min-h-11 min-w-0 rounded-lg border border-black/10 p-2 text-xs font-normal" />
        </label>
        <AdminSubmitButton pendingLabel="Uploading…">Upload to library</AdminSubmitButton>
      </form> : null}
      <AdminCard>
        {unavailable ? (
          <p role="alert" className="py-8 text-center text-sm text-red-800">The media library could not be loaded. Reload the page to try again.</p>
        ) : media.length ? (
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

    </div>
  );
}
