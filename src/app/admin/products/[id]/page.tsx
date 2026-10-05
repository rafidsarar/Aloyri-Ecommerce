import Image from "next/image";
import { notFound } from "next/navigation";
import { saveProductEditorial } from "@/app/admin/actions";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { getProductById, formatPrice } from "@/lib/catalog";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  readStorefrontConfig,
  storefrontMediaUrl,
} from "@/lib/storefront-admin-store";

export default async function AdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPage();
  const [{ id }, query, config, catalog] = await Promise.all([
    params,
    searchParams,
    readStorefrontConfig(),
    fetchCrmCatalog(),
  ]);

  if (!catalog.ok) {
    return (
      <AdminShell
        username={admin.username}
        title="Product presentation"
        subtitle="Live product identity could not be loaded from CRM."
      >
        <AdminNotice tone="warning">
          CRM catalog is unavailable. Editing is paused so website content cannot be attached to the wrong product.
        </AdminNotice>
      </AdminShell>
    );
  }

  const live = catalog.body.products.find((product) => product.id === id);
  if (!live) notFound();

  const local = getProductById(id);
  const editorial = config.products[id] || {};
  const defaults = {
    slug: editorial.slug || local?.slug || id,
    description: editorial.description ?? local?.description ?? "",
    routineStep: editorial.routineStep ?? local?.routineStep ?? "",
    skinNote: editorial.skinNote ?? local?.skinNote ?? "",
    texture: editorial.texture ?? local?.texture ?? "",
    bestFor: editorial.bestFor ?? local?.bestFor ?? "",
    howToUse: editorial.howToUse ?? local?.howToUse ?? [],
    careNotes: editorial.careNotes ?? local?.careNotes ?? [],
    ingredientNote: editorial.ingredientNote ?? local?.ingredientNote ?? "",
    featured: editorial.featured ?? local?.featured ?? false,
    bestseller: editorial.bestseller ?? local?.bestseller ?? false,
  };

  return (
    <AdminShell
      username={admin.username}
      title={live.name}
      subtitle="CRM-owned commerce fields are locked. Everything below the commerce summary belongs to the website."
    >
      {query.saved ? <AdminNotice>Product website content saved.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <AdminCard>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Brand", live.brand],
            ["Size", live.size],
            ["Price", formatPrice(live.salePrice ?? live.price)],
            ["Available stock", String(live.availableStock)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#f7f4f2] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/38">{label}</p>
              <p className="mt-2 text-sm font-semibold">{value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[.1em] text-[#713a35]/55">Synced from CRM</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <form action={saveProductEditorial} className="mt-5 grid gap-5">
        <input type="hidden" name="productId" value={id} />

        <AdminCard>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Website slug
              <input name="slug" defaultValue={defaults.slug} maxLength={120} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Description
              <textarea name="description" defaultValue={defaults.description} rows={5} maxLength={1200} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Routine step
                <input name="routineStep" defaultValue={defaults.routineStep} maxLength={180} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Texture
                <input name="texture" defaultValue={defaults.texture} maxLength={180} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Routine note
              <textarea name="skinNote" defaultValue={defaults.skinNote} rows={3} maxLength={600} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Best for
              <textarea name="bestFor" defaultValue={defaults.bestFor} rows={3} maxLength={500} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <AdminCard>
            <label className="grid gap-1.5 text-sm font-medium">
              How to use
              <textarea
                name="howToUse"
                defaultValue={defaults.howToUse.join("\n")}
                rows={8}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">One step per line.</span>
            </label>
          </AdminCard>
          <AdminCard>
            <label className="grid gap-1.5 text-sm font-medium">
              Care notes
              <textarea
                name="careNotes"
                defaultValue={defaults.careNotes.join("\n")}
                rows={8}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">One note per line.</span>
            </label>
          </AdminCard>
        </div>

        <AdminCard>
          <label className="grid gap-1.5 text-sm font-medium">
            Ingredient note
            <textarea name="ingredientNote" defaultValue={defaults.ingredientNote} rows={4} maxLength={1200} className="rounded-xl border border-black/10 px-4 py-3" />
          </label>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Storefront merchandising</p>
          <div className="mt-4 flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" defaultChecked={defaults.featured} />
              Featured product
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="bestseller" defaultChecked={defaults.bestseller} />
              Bestseller badge
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Website product image</p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            Uploading an image stores it in the private Ecommerce media store. It does not change CRM.
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-[180px_1fr] md:items-start">
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[#f7f4f2]">
              {editorial.mediaPath ? (
                <Image
                  src={storefrontMediaUrl(editorial.mediaPath)}
                  alt={live.name}
                  width={360}
                  height={450}
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-black/35">
                  Using verified/default storefront photography
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
              />
              <p className="text-xs text-black/40">JPG, PNG or WebP · maximum 5 MB.</p>
              {editorial.mediaPath ? (
                <label className="flex items-center gap-2 text-sm text-red-700">
                  <input type="checkbox" name="removeMedia" />
                  Remove custom website image
                </label>
              ) : null}
            </div>
          </div>
        </AdminCard>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save product content
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
