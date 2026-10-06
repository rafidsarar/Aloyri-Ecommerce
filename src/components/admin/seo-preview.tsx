import Image from "next/image";

export function SeoSearchPreview({
  title,
  description,
  canonical,
}: {
  title: string;
  description: string;
  canonical: string;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
        Search preview
      </p>
      <p className="mt-4 text-sm text-emerald-800">
        aloyri-ecommerce.vercel.app{canonical === "/" ? "" : canonical}
      </p>
      <p className="mt-1 text-xl font-medium text-[#1a0dab]">
        {title || "Untitled page"}
      </p>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-black/58">
        {description || "Add a meta description to control how this page is described."}
      </p>
    </div>
  );
}

export function SeoSocialPreview({
  title,
  description,
  imagePath,
}: {
  title: string;
  description: string;
  imagePath?: string;
}) {
  const image = imagePath
    ? "/api/storefront-media/" +
      (imagePath.startsWith("media/") ? imagePath.slice(6) : imagePath)
    : undefined;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
      {image ? (
        <div className="aspect-[1.91/1] bg-[#f5e8e2]">
          <Image
            src={image}
            alt=""
            width={1200}
            height={630}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[1.91/1] items-center justify-center bg-[#f5e8e2] px-6 text-center text-xs text-black/38">
          Add a dedicated social image for a richer share preview.
        </div>
      )}
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-[.12em] text-black/35">
          Aloyri
        </p>
        <p className="mt-1 text-base font-semibold">{title || "Untitled page"}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/48">
          {description || "No social description configured."}
        </p>
      </div>
    </div>
  );
}
