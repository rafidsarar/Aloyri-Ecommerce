import { notFound } from "next/navigation";
import { enableDraftPreview } from "@/app/admin/actions";
import { savePageSeo } from "@/app/admin/seo/actions";
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
import {
  effectiveSeoEntry,
  publicPageLabels,
  publicPagePaths,
} from "@/lib/seo-manager";
import {
  defaultSeoConfig,
  readDraftStorefrontConfig,
  type SeoEntry,
  type SeoPageKey,
} from "@/lib/storefront-admin-store";

function resolveKey(
  config: Awaited<ReturnType<typeof readDraftStorefrontConfig>>,
  key: string,
): {
  label: string;
  path: string;
  entry: SeoEntry;
  fallback: SeoEntry;
} | null {
  if (key === "homepage") {
    return {
      label: "Homepage",
      path: "/",
      entry: config.seo.homepage,
      fallback: defaultSeoConfig.homepage,
    };
  }
  if (key === "shop") {
    return {
      label: "Shop",
      path: "/shop",
      entry: config.seo.shop,
      fallback: defaultSeoConfig.shop,
    };
  }
  if (key.startsWith("category-")) {
    const category = key.slice("category-".length);
    if (!["cleansers", "moisturizers", "sunscreen"].includes(category)) return null;
    const typed = category as keyof typeof config.seo.categories;
    return {
      label: "Category · " + category[0].toUpperCase() + category.slice(1),
      path: "/category/" + category,
      entry: config.seo.categories[typed],
      fallback: defaultSeoConfig.categories[typed],
    };
  }
  if (
    ["about", "faq", "shipping", "returns", "contact", "customerCare", "privacy", "terms"].includes(
      key,
    )
  ) {
    const typed = key as SeoPageKey;
    return {
      label: publicPageLabels[typed],
      path: publicPagePaths[typed],
      entry: config.seo.pages[typed],
      fallback: defaultSeoConfig.pages[typed],
    };
  }
  return null;
}

export default async function SeoPageEditor({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("seo.view");
  const [{ key }, query, config] = await Promise.all([
    params,
    searchParams,
    readDraftStorefrontConfig(),
  ]);
  const resolved = resolveKey(config, key);
  if (!resolved) notFound();

  const effective = effectiveSeoEntry(resolved.entry, {
    title: resolved.fallback.title || resolved.label,
    description: resolved.fallback.description || "",
    canonical: resolved.fallback.canonical || resolved.path,
    index: resolved.fallback.index,
    follow: resolved.fallback.follow,
    ogTitle: resolved.fallback.ogTitle,
    ogDescription: resolved.fallback.ogDescription,
    ogImagePath: resolved.fallback.ogImagePath,
  });

  return (
    <AdminShell
      username={admin.username}
      title={resolved.label + " SEO"}
      subtitle="Search and social metadata saves to Draft and reaches customers only after Publishing."
    >
      {query.saved ? <AdminNotice>SEO draft saved.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <form action={savePageSeo} className="grid gap-5">
        <input type="hidden" name="key" value={key} />
        <input type="hidden" name="path" value={resolved.path} />

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
              <span className="text-xs font-normal text-black/40">
                Internal paths only. External canonicals and protocol-relative URLs are rejected.
              </span>
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
                  JPG, PNG or WebP · maximum 5 MB. Recommended 1200×630.
                </span>
              </label>
              {effective.ogImagePath ? (
                <label className="flex items-center gap-2 text-sm text-red-700">
                  <input type="checkbox" name="removeOgImage" />
                  Remove current social image
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
          canonical={effective.canonical || resolved.path}
        />

        <div className="flex flex-wrap justify-end gap-3">
          <button
            formAction={enableDraftPreview}
            className="rounded-xl border border-[#713a35]/18 px-5 py-3.5 text-sm font-semibold text-[#713a35]"
          >
            Preview current draft
          </button>
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save SEO draft
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
