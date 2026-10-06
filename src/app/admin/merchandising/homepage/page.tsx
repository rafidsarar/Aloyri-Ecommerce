import {
  saveHomepageMerchandising,
} from "@/app/admin/merchandising/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

const sectionKinds = [
  ["bestsellers", "Bestsellers"],
  ["featured", "Featured products"],
  ["new-arrivals", "New arrivals"],
  ["collection", "Collection"],
  ["campaign", "Campaign"],
] as const;

export default async function HomepageMerchandisingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPage();
  const [query, config, catalog] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);
  const products = catalog.ok ? catalog.body.products : [];
  const rows = [
    ...config.merchandising.homepageSections,
    {
      id: "",
      kind: "featured" as const,
      enabled: false,
      eyebrow: "",
      title: "",
      copy: "",
      maxProducts: 6,
    },
  ].slice(0, 20);

  return (
    <AdminShell
      username={admin.username}
      title="Homepage merchandising"
      subtitle="Control hero product, storefront section order, collection/campaign placement and global out-of-stock presentation. Live commerce values stay in CRM."
    >
      {query.saved ? <AdminNotice>Homepage merchandising draft saved.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable, so hero-product selection is temporarily limited.
        </AdminNotice>
      ) : null}

      <form action={saveHomepageMerchandising} className="grid gap-5">
        <input type="hidden" name="sectionCount" value={rows.length} />

        <AdminCard>
          <p className="text-sm font-semibold">Global merchandising defaults</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Homepage hero product
              <select
                name="heroProductId"
                defaultValue={config.homepage.heroProductId}
                className="rounded-xl border border-black/10 px-4 py-3"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.brand} · {product.name} · stock {product.availableStock}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-black/40">
                Price and stock remain CRM-controlled.
              </span>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Global out-of-stock behavior
              <select
                name="outOfStockMode"
                defaultValue={config.merchandising.outOfStockMode}
                className="rounded-xl border border-black/10 px-4 py-3"
              >
                <option value="keep">Keep original position</option>
                <option value="push-down">Push to bottom</option>
                <option value="hide">Hide out-of-stock products</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Shop default merchandising order
              <select
                name="shopSortMode"
                defaultValue={config.merchandising.shopSortMode}
                className="rounded-xl border border-black/10 px-4 py-3"
              >
                <option value="priority">Manual priority first</option>
                <option value="featured">Featured flag first</option>
              </select>
            </label>
          </div>
        </AdminCard>

        <div>
          <div className="mb-3">
            <p className="text-sm font-semibold">Homepage product & campaign sections</p>
            <p className="mt-1 text-xs leading-5 text-black/45">
              Position numbers control section order. Built-in sections use product flags; Collection and Campaign sections require a matching reference.
            </p>
          </div>

          <div className="grid gap-4">
            {rows.map((section, index) => (
              <AdminCard key={section.id || "new-section"}>
                <input
                  type="hidden"
                  name={"section_" + index + "_id"}
                  value={section.id}
                />

                <div className="grid gap-4 lg:grid-cols-[90px_180px_1fr_160px] lg:items-end">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Position
                    <input
                      type="number"
                      name={"section_" + index + "_position"}
                      defaultValue={index + 1}
                      min={0}
                      max={1000}
                      className="rounded-lg border border-black/10 px-3 py-2"
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Type
                    <select
                      name={"section_" + index + "_kind"}
                      defaultValue={section.kind}
                      className="rounded-lg border border-black/10 px-3 py-2"
                    >
                      {sectionKinds.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Reference
                    <select
                      name={"section_" + index + "_referenceId"}
                      defaultValue={section.referenceId || ""}
                      className="rounded-lg border border-black/10 px-3 py-2"
                    >
                      <option value="">No reference</option>
                      <optgroup label="Collections">
                        {config.merchandising.collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.title}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Campaigns">
                        {config.merchandising.campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.title}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Max products
                    <input
                      type="number"
                      name={"section_" + index + "_maxProducts"}
                      defaultValue={section.maxProducts}
                      min={1}
                      max={12}
                      className="rounded-lg border border-black/10 px-3 py-2"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Eyebrow
                    <input
                      name={"section_" + index + "_eyebrow"}
                      defaultValue={section.eyebrow}
                      maxLength={120}
                      className="rounded-xl border border-black/10 px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Section title
                    <input
                      name={"section_" + index + "_title"}
                      defaultValue={section.title}
                      maxLength={180}
                      className="rounded-xl border border-black/10 px-4 py-3"
                    />
                  </label>
                </div>

                <label className="mt-4 grid gap-1.5 text-sm font-medium">
                  Section copy
                  <textarea
                    name={"section_" + index + "_copy"}
                    defaultValue={section.copy}
                    rows={3}
                    maxLength={700}
                    className="rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name={"section_" + index + "_enabled"}
                      defaultChecked={section.enabled}
                    />
                    Enabled
                  </label>
                  {section.id ? (
                    <label className="flex items-center gap-2 text-sm text-red-700">
                      <input
                        type="checkbox"
                        name={"section_" + index + "_remove"}
                      />
                      Remove section
                    </label>
                  ) : null}
                </div>
              </AdminCard>
            ))}
          </div>
        </div>

        <AdminNotice tone="neutral">
          Campaign schedules become active automatically after the campaign has been published once. Scheduling changes themselves still use Draft → Preview → Publish.
        </AdminNotice>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save homepage merchandising draft
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
