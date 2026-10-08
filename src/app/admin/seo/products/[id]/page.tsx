import { notFound } from "next/navigation";
import { saveProductSeo } from "@/app/admin/seo/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import {
  SeoSearchPreview,
  SeoSocialPreview,
} from "@/components/admin/seo-preview";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  effectiveSeoEntry,
  productSeoFallback,
} from "@/lib/seo-manager";
import {
  applyStorefrontEditorial,
  readDraftStorefrontConfig,
} from "@/lib/storefront-admin-store";

export default async function ProductSeoEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("seo.view");
  const [{ id }, query, config, catalog] = await Promise.all([
    params,
    searchParams,
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);

  if (!catalog.ok) {
    return (
      <AdminShell
        username={admin.username}
        title="Product SEO"
        subtitle="Live product identity could not be loaded from CRM."
      >
        <AdminNotice tone="warning">
          Editing is paused until the customer-safe CRM catalog is available.
        </AdminNotice>
      </AdminShell>
    );
  }

  const products = applyStorefrontEditorial(catalog.body.products, config);
  const product = products.find((candidate) => candidate.id === id);
  if (!product) notFound();

  const fallback = productSeoFallback(product);
  const effective = effectiveSeoEntry(config.seo.products[id], {
    ...fallback,
    ogImagePath: product.mediaPath,
  });
  const canonicalPath = fallback.canonical;

  return (
    <AdminShell
      username={admin.username}
      title={product.name + " SEO"}
      subtitle="SEO metadata is website-owned. CRM price, stock and order data are not editable here."
    >
      {query.saved ? <AdminNotice>Product SEO saved live.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <form action={saveProductSeo} className="grid gap-5">
        <input type="hidden" name="productId" value={id} />
        <input type="hidden" name="canonicalFallback" value={canonicalPath} />
        <input type="hidden" name="path" value={canonicalPath} />

        <AdminCard>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-[#f7f4f2] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/38">
                Brand
              </p>
              <p className="mt-2 text-sm font-semibold">{product.brand}</p>
            </div>
            <div className="rounded-xl bg-[#f7f4f2] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/38">
                Price
              </p>
              <p className="mt-2 text-sm font-semibold">CRM controlled</p>
            </div>
            <div className="rounded-xl bg-[#f7f4f2] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/38">
                Stock
              </p>
              <p className="mt-2 text-sm font-semibold">
                {product.availableStock} available · CRM controlled
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              SEO title
              <input
                name="title"
                defaultValue={effective.title}
                maxLength={120}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">
                Current: {(effective.title || "").length} characters · recommended ≤ 60.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Meta description
              <textarea
                name="description"
                defaultValue={effective.description}
                rows={4}
                maxLength={320}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">
                Current: {(effective.description || "").length} characters · recommended 70–160.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Canonical path
              <input
                name="canonical"
                defaultValue={effective.canonical}
                maxLength={400}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="index" defaultChecked={effective.index !== false} />
                Allow search indexing
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="follow" defaultChecked={effective.follow !== false} />
                Allow link following
              </label>
            </div>
          </div>
        </AdminCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <AdminCard>
            <p className="text-sm font-semibold">Social sharing</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Social title
                <input
                  name="ogTitle"
                  defaultValue={effective.ogTitle}
                  maxLength={120}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Social description
                <textarea
                  name="ogDescription"
                  defaultValue={effective.ogDescription}
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
                <span className="text-xs font-normal text-black/40">
                  If unset, the product website image is used when available.
                </span>
              </label>
              {effective.ogImagePath ? (
                <label className="flex items-center gap-2 text-sm text-red-700">
                  <input type="checkbox" name="removeOgImage" />
                  Remove dedicated social image
                </label>
              ) : null}
            </div>
          </AdminCard>

          <SeoSocialPreview
            title={effective.ogTitle || effective.title || ""}
            description={effective.ogDescription || effective.description || ""}
            imagePath={effective.ogImagePath}
          />
        </div>

        <SeoSearchPreview
          title={effective.title || ""}
          description={effective.description || ""}
          canonical={effective.canonical || canonicalPath}
        />

        <div className="flex flex-wrap justify-end gap-3">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save product SEO
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
