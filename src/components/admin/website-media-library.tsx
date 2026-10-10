import Image from "next/image";
import { AdminCard } from "@/components/admin/admin-shell";
import { listStorefrontMedia, storefrontMediaUrl } from "@/lib/storefront-admin-store";

type Media = Awaited<ReturnType<typeof listStorefrontMedia>>;

/** Shared, read-only media browser. Uploads remain in authorized editors. */
export function WebsiteMediaLibrary({ media }: { media: Media }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-black/60">Browse images already saved to the website media library. Campaign, banner and product editors keep their existing uploads and save actions.</p>
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

    </div>
  );
}
