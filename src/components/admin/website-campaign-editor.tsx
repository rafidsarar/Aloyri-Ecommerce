import Image from "next/image";
import { notFound } from "next/navigation";
import { deleteCampaign, saveCampaign } from "@/app/admin/merchandising/actions";
import { AdminCard, AdminNotice } from "@/components/admin/admin-shell";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { campaignScheduleState } from "@/lib/merchandising";
import { storefrontMediaUrl, type StorefrontConfig } from "@/lib/storefront-admin-store";

function toDhakaInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((candidate) => candidate.type === type)?.value || "";
  return (
    part("year") +
    "-" +
    part("month") +
    "-" +
    part("day") +
    "T" +
    part("hour") +
    ":" +
    part("minute")
  );
}


export function WebsiteCampaignEditor({ id, query = {}, config, catalog, inBuilder = false }: {
  id: string;
  query?: { saved?: string; error?: string };
  config: StorefrontConfig;
  catalog: Awaited<ReturnType<typeof fetchCrmCatalog>>;
  inBuilder?: boolean;
}) {
  const isNew = id === "new";
  const campaign = isNew
    ? null
    : config.merchandising.campaigns.find((candidate) => candidate.id === id);
  if (!isNew && !campaign) notFound();

  const products = catalog.ok ? catalog.body.products : [];
  const selected = new Map(
    (campaign?.productIds || []).map((productId, index) => [
      productId,
      index + 1,
    ]),
  );
  const imageUrl = campaign?.imagePath
    ? storefrontMediaUrl(campaign.imagePath)
    : "";

  return (
    <div className="space-y-5">
      {query.saved ? <AdminNotice>Campaign draft saved.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog is unavailable. Product selection and promotion validation are temporarily incomplete.
        </AdminNotice>
      ) : null}

      <form action={saveCampaign} className="grid gap-5">
        {inBuilder ? <input type="hidden" name="builderWorkspace" value="campaigns" /> : null}
        <input type="hidden" name="id" value={campaign?.id || ""} />
        <input
          type="hidden"
          name="catalogIds"
          value={products.map((product) => product.id).join("\n")}
        />
        <input
          type="hidden"
          name="currentImagePath"
          value={campaign?.imagePath || ""}
        />

        <AdminCard>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={campaign?.active ?? true}
                />
                Enable campaign schedule
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="showProducts"
                  defaultChecked={campaign?.showProducts ?? true}
                />
                Show target products
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="promotionOnly"
                  defaultChecked={campaign?.promotionOnly ?? false}
                />
                Promotion-only products
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Eyebrow
              <input
                name="eyebrow"
                defaultValue={campaign?.eyebrow || "Aloyri campaign"}
                maxLength={120}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Campaign title
              <input
                name="title"
                defaultValue={campaign?.title || ""}
                maxLength={140}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Campaign copy
              <textarea
                name="copy"
                defaultValue={campaign?.copy || ""}
                rows={5}
                maxLength={1600}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Starts
                <input
                  type="datetime-local"
                  name="startAt"
                  defaultValue={toDhakaInput(campaign?.startAt || "")}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
                <span className="text-xs font-normal text-black/40">
                  Interpreted as Bangladesh time.
                </span>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Ends
                <input
                  type="datetime-local"
                  name="endAt"
                  defaultValue={toDhakaInput(campaign?.endAt || "")}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
                <span className="text-xs font-normal text-black/40">
                  Leave blank for no end date.
                </span>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                CTA label
                <input
                  name="ctaLabel"
                  defaultValue={campaign?.ctaLabel || "Shop campaign"}
                  maxLength={80}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                CTA internal path
                <input
                  name="ctaHref"
                  defaultValue={campaign?.ctaHref || "/shop"}
                  maxLength={400}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              Campaign out-of-stock behavior
              <select
                name="outOfStockMode"
                defaultValue={campaign?.outOfStockMode || "inherit"}
                className="rounded-xl border border-black/10 px-4 py-3"
              >
                <option value="inherit">Use product/global rules</option>
                <option value="keep">Keep original position</option>
                <option value="push-down">Push to bottom</option>
                <option value="hide">Hide out-of-stock products</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Campaign badge
              <input
                name="badgeText"
                defaultValue={campaign?.badgeText || ""}
                maxLength={32}
                placeholder="Seasonal edit"
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">
                Sale/discount wording is allowed only when Promotion-only is enabled. Product sale prices still come from CRM.
              </span>
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Campaign creative</p>
          <div className="mt-4 grid gap-5 md:grid-cols-[220px_1fr]">
            <div className="aspect-[16/10] overflow-hidden rounded-xl bg-[#f5e8e2]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt=""
                  width={640}
                  height={400}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-black/35">
                  No campaign image
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

        {!isNew && campaign ? (
          <AdminCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Saved draft preview</p>
                <p className="mt-1 text-xs text-black/45">
                  This preview reflects the last saved Draft values, not unsaved form changes.
                </p>
              </div>
              <span className="rounded-full bg-[#f2e8e4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#713a35]">
                {campaignScheduleState(campaign)}
              </span>
            </div>
            <div className="mt-5 overflow-hidden rounded-[1.75rem] bg-[#713a35] text-white">
              <div className="grid md:grid-cols-[1.1fr_.9fr]">
                <div className="p-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/55">
                    {campaign.badgeText || campaign.eyebrow}
                  </p>
                  <p className="display mt-3 text-4xl">{campaign.title}</p>
                  <p className="mt-4 text-sm leading-6 text-white/62">
                    {campaign.copy}
                  </p>
                  {campaign.ctaLabel ? (
                    <span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#713a35]">
                      {campaign.ctaLabel}
                    </span>
                  ) : null}
                </div>
                <div className="relative min-h-[220px] bg-[#9c5d50]">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      sizes="40vw"
                      className="object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </AdminCard>
        ) : null}

        <AdminCard>
          <p className="text-sm font-semibold">Collection target</p>
          <p className="mt-1 text-xs text-black/45">
            A campaign can inherit all products from one collection and optionally add direct products below.
          </p>
          <select
            name="collectionId"
            defaultValue={campaign?.collectionId || ""}
            className="mt-4 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          >
            <option value="">No collection target</option>
            {config.merchandising.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.title}
              </option>
            ))}
          </select>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Direct product targets</p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            Direct targets are added after collection products. Lower order numbers appear first. Promotion-only mode filters this list at runtime to products where CRM currently provides a valid sale price.
          </p>
          <div className="mt-5 divide-y divide-black/7">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="grid gap-3 py-3 md:grid-cols-[40px_1fr_110px_160px] md:items-center"
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
                    stock {product.availableStock}
                    {product.salePrice &&
                    product.salePrice > 0 &&
                    product.salePrice < product.price
                      ? " · CRM promotion active"
                      : " · no CRM sale"}
                  </p>
                </div>
                <input
                  type="number"
                  name={"product_" + product.id + "_order"}
                  defaultValue={selected.get(product.id) || index + 1}
                  min={0}
                  max={10000}
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
                <span className="text-xs font-semibold text-[#713a35]/60">
                  price + stock CRM locked
                </span>
              </div>
            ))}
          </div>
        </AdminCard>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save campaign draft
          </button>
        </div>
      </form>

      {!isNew ? (
        <form action={deleteCampaign} className="mt-5">
          <input type="hidden" name="id" value={campaign!.id} />
          <AdminCard>
            <p className="text-sm font-semibold text-red-700">Delete campaign</p>
            <p className="mt-1 text-xs text-black/45">
              Deletion is blocked while a homepage section references this campaign.
            </p>
            <button className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
              Delete from draft
            </button>
          </AdminCard>
        </form>
      ) : null}

    </div>
  );
}
