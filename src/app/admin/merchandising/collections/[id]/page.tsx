import Image from "next/image";
import { notFound } from "next/navigation";
import {
  deleteCollection,
  saveCollection,
} from "@/app/admin/merchandising/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  readDraftStorefrontConfig,
  storefrontMediaUrl,
} from "@/lib/storefront-admin-store";

export default async function CollectionEditor({
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
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);
  const isNew = id === "new";
  const collection = isNew
    ? null
    : config.merchandising.collections.find((candidate) => candidate.id === id);
  if (!isNew && !collection) notFound();

  const products = catalog.ok ? catalog.body.products : [];
  const selected = new Map(
    (collection?.productIds || []).map((productId, index) => [
      productId,
      index + 1,
    ]),
  );
  const imageUrl = collection?.imagePath
    ? storefrontMediaUrl(collection.imagePath)
    : "";
  const ogImageUrl = collection?.seo.ogImagePath
    ? storefrontMediaUrl(collection.seo.ogImagePath)
    : "";

  return (
    <AdminShell
      username={admin.username}
      title={isNew ? "New collection" : collection!.title}
      subtitle="Collection content and ordering are website-owned. Price, stock and promotion eligibility remain live CRM data."
    >
      {query.saved ? <AdminNotice>Collection draft saved.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable. You can edit collection copy, but product selection is temporarily unavailable.
        </AdminNotice>
      ) : null}

      <form action={saveCollection} className="grid gap-5">
        <input type="hidden" name="id" value={collection?.id || ""} />
        <input
          type="hidden"
          name="catalogIds"
          value={products.map((product) => product.id).join("\n")}
        />
        <input
          type="hidden"
          name="currentImagePath"
          value={collection?.imagePath || ""}
        />
        <input
          type="hidden"
          name="currentOgImagePath"
          value={collection?.seo.ogImagePath || ""}
        />

        <AdminCard>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={collection?.active ?? true}
                />
                Active collection
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Eyebrow
              <input
                name="eyebrow"
                defaultValue={collection?.eyebrow || "Aloyri collection"}
                maxLength={120}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Collection title
              <input
                name="title"
                defaultValue={collection?.title || ""}
                maxLength={120}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              URL slug
              <input
                name="slug"
                defaultValue={collection?.slug || ""}
                maxLength={80}
                placeholder="dry-skin"
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">
                Published URL: /collections/your-slug
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Description
              <textarea
                name="description"
                defaultValue={collection?.description || ""}
                rows={5}
                maxLength={1200}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Out-of-stock behavior
              <select
                name="outOfStockMode"
                defaultValue={collection?.outOfStockMode || "inherit"}
                className="rounded-xl border border-black/10 px-4 py-3"
              >
                <option value="inherit">Use global setting</option>
                <option value="keep">Keep original position</option>
                <option value="push-down">Push to bottom</option>
                <option value="hide">Hide out-of-stock products</option>
              </select>
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Collection image</p>
          <div className="mt-4 grid gap-5 md:grid-cols-[180px_1fr]">
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[#f7f4f2]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt=""
                  width={360}
                  height={450}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-black/35">
                  No collection image
                </div>
              )}
            </div>
            <div className="grid content-start gap-3">
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="rounded-xl border border-black/10 px-4 py-3 text-sm"
              />
              {imageUrl ? (
                <label className="flex items-center gap-2 text-sm text-red-700">
                  <input type="checkbox" name="removeImage" />
                  Remove image
                </label>
              ) : null}
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Products & manual order</p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            Select products and give each one an order number. Lower numbers appear first. Price and stock shown here are read-only CRM data.
          </p>
          <div className="mt-5 divide-y divide-black/7">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="grid gap-3 py-3 md:grid-cols-[40px_1fr_110px_100px] md:items-center"
              >
                <input
                  type="checkbox"
                  name={"product_" + product.id + "_selected"}
                  defaultChecked={selected.has(product.id)}
                  aria-label={"Select " + product.name}
                />
                <div>
                  <p className="text-sm font-medium">
                    {product.brand} · {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-black/40">
                    {product.id} · stock {product.availableStock}
                  </p>
                </div>
                <input
                  type="number"
                  name={"product_" + product.id + "_order"}
                  defaultValue={selected.get(product.id) || index + 1}
                  min={0}
                  max={10000}
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  aria-label={"Order for " + product.name}
                />
                <span className="text-xs font-semibold text-[#713a35]/60">
                  CRM locked
                </span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Collection SEO</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              SEO title
              <input
                name="seoTitle"
                defaultValue={collection?.seo.title || collection?.title || ""}
                maxLength={120}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Meta description
              <textarea
                name="seoDescription"
                defaultValue={
                  collection?.seo.description || collection?.description || ""
                }
                rows={3}
                maxLength={320}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Canonical path
              <input
                name="seoCanonical"
                defaultValue={
                  collection?.seo.canonical ||
                  (collection?.slug
                    ? "/collections/" + collection.slug
                    : "/collections/")
                }
                maxLength={400}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="seoIndex"
                  defaultChecked={collection?.seo.index !== false}
                />
                Allow search indexing
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="seoFollow"
                  defaultChecked={collection?.seo.follow !== false}
                />
                Allow link following
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Social title
              <input
                name="seoOgTitle"
                defaultValue={collection?.seo.ogTitle || collection?.title || ""}
                maxLength={120}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Social description
              <textarea
                name="seoOgDescription"
                defaultValue={
                  collection?.seo.ogDescription ||
                  collection?.description ||
                  ""
                }
                rows={3}
                maxLength={320}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Social image
              <input
                type="file"
                name="ogImage"
                accept="image/jpeg,image/png,image/webp"
                className="rounded-xl border border-black/10 px-4 py-3 text-sm"
              />
            </label>
            {ogImageUrl ? (
              <label className="flex items-center gap-2 text-sm text-red-700">
                <input type="checkbox" name="removeOgImage" />
                Remove social image
              </label>
            ) : null}
          </div>
        </AdminCard>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save collection draft
          </button>
        </div>
      </form>

      {!isNew ? (
        <form action={deleteCollection} className="mt-5">
          <input type="hidden" name="id" value={collection!.id} />
          <AdminCard>
            <p className="text-sm font-semibold text-red-700">Delete collection</p>
            <p className="mt-1 text-xs text-black/45">
              Deletion is blocked while this collection is referenced by a campaign or homepage section.
            </p>
            <button className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
              Delete from draft
            </button>
          </AdminCard>
        </form>
      ) : null}
    </AdminShell>
  );
}
