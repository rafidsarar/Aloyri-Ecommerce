import Link from "next/link";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { saveHomepage } from "@/app/admin/actions";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function AdminHomepagePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireAdminPermission("homepage.view");
  const [{ saved }, config, catalog] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
    fetchCrmCatalog(),
  ]);
  const home = config.homepage;
  const products = catalog.ok ? catalog.body.products : [];
  const heroProductId = products.some(
    (product) => product.id === home.heroProductId,
  )
    ? home.heroProductId
    : products.find((product) => product.availableStock > 0)?.id ||
      products[0]?.id ||
      "";

  return (
    <AdminShell
      username={admin.username}
      title="Homepage"
      subtitle="Edit your homepage, save changes directly to your live website."
    >
      {saved ? <AdminNotice>Changes saved live. <Link href="/admin/history" className="font-semibold underline">Version history →</Link></AdminNotice> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/merchandising" className="rounded-xl border border-black/10 bg-white p-4 text-sm font-semibold hover:border-[#713a35]/40 focus-visible:outline-2 focus-visible:outline-offset-2">
          Arrange homepage sections <span aria-hidden="true">→</span>
          <span className="mt-1 block text-xs font-normal text-black/60">Show, hide and reorder product collections and campaigns.</span>
        </Link>
        <Link href="/admin/settings" className="rounded-xl border border-black/10 bg-white p-4 text-sm font-semibold hover:border-[#713a35]/40 focus-visible:outline-2 focus-visible:outline-offset-2">
          Website appearance & settings <span aria-hidden="true">→</span>
          <span className="mt-1 block text-xs font-normal text-black/60">Manage site-wide branding and storefront information.</span>
        </Link>
        <Link href="/admin/history" className="rounded-xl border border-black/10 bg-white p-4 text-sm font-semibold hover:border-[#713a35]/40 focus-visible:outline-2 focus-visible:outline-offset-2">
          Version history <span aria-hidden="true">→</span>
          <span className="mt-1 block text-xs font-normal text-black/60">Every save updates the live website; previous versions remain available.</span>
        </Link>
      </div>
      <form action={saveHomepage} className="grid gap-5">
        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold">Homepage layout</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showHero" defaultChecked={home.showHero} /> Show main banner</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showCategories" defaultChecked={home.showCategories} /> Show category shortcuts</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showBrandStory" defaultChecked={home.showBrandStory} /> Show brand story</label>
            <label className="grid gap-1 text-sm font-medium">Banner layout
              <select name="heroLayout" defaultValue={home.heroLayout} className="rounded-xl border border-black/10 px-4 py-3">
                <option value="split">Split — text beside product</option>
                <option value="stacked">Stacked — text above product</option>
              </select>
            </label>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold">Guided shopping feature</h2>
          <p className="mb-4 text-xs text-black/60">Edit the routine finder introduction on the homepage. The finder uses your live catalog and does not save quiz answers.</p>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">Section headline
              <input name="routineFinderHeadline" defaultValue={home.routineFinderHeadline} maxLength={140} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">Section description
              <textarea name="routineFinderIntro" defaultValue={home.routineFinderIntro} rows={3} maxLength={420} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold">Main banner</h2>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Short label above heading
              <input name="eyebrow" defaultValue={home.eyebrow} maxLength={120} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Headline
              <textarea name="headline" defaultValue={home.headline} rows={3} maxLength={180} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Introduction
              <textarea name="intro" defaultValue={home.intro} rows={4} maxLength={500} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <AdminCard>
            <p className="text-sm font-semibold">Main button</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Label
                <input name="primaryLabel" defaultValue={home.primaryLabel} maxLength={80} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Destination (e.g. /shop)
                <input name="primaryHref" defaultValue={home.primaryHref} maxLength={200} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
            </div>
          </AdminCard>

          <AdminCard>
            <p className="text-sm font-semibold">Secondary button</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Label
                <input name="secondaryLabel" defaultValue={home.secondaryLabel} maxLength={80} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Destination (e.g. /shop)
                <input name="secondaryHref" defaultValue={home.secondaryHref} maxLength={200} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
            </div>
          </AdminCard>
        </div>

        <AdminCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Hero product
              <select name="heroProductId" defaultValue={heroProductId} className="rounded-xl border border-black/10 px-4 py-3">
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.brand} · {product.name}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-black/40">
                Product identity, price and stock stay synced from CRM.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Highlights
              <textarea
                name="featureChips"
                defaultValue={home.featureChips.join("\n")}
                rows={4}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">One item per line.</span>
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-sm font-semibold">Promotional banners</h2>
          <p className="mt-2 text-xs leading-5 text-black/60">
            Create up to two customer-facing banners. Save to update the live website immediately. Only safe internal shop and collection destinations are supported.
          </p>
          <label className="mt-5 grid gap-2 text-sm font-medium">Banner placement
            <select name="promoPlacement" defaultValue={home.promoPlacement} className="min-h-11 rounded-xl border border-black/10 px-4">
              <option value="before-products">Before product collections</option>
              <option value="after-products">After product collections</option>
            </select>
          </label>
          <div className="mt-5 grid gap-5">
            {Array.from({ length: 2 }, (_, index) => {
              const banner = home.promoBanners[index];
              const prefix = `promo${index}`;
              return (
                <fieldset key={index} className="min-w-0 rounded-2xl border border-black/10 bg-black/[.02] p-4 sm:p-5">
                  <legend className="px-2 text-sm font-semibold">Banner {index + 1}</legend>
                  <div className="grid gap-4">
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input type="checkbox" name={`${prefix}Enabled`} defaultChecked={banner?.enabled || false} />
                      Show this banner
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">Small label
                      <input name={`${prefix}Eyebrow`} defaultValue={banner?.eyebrow || ""} maxLength={80} className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-4" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">Headline
                      <input name={`${prefix}Title`} defaultValue={banner?.title || ""} maxLength={160} className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-4" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">Supporting copy
                      <textarea name={`${prefix}Copy`} defaultValue={banner?.copy || ""} rows={3} maxLength={360} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-medium">Button text
                        <input name={`${prefix}CtaLabel`} defaultValue={banner?.ctaLabel || ""} maxLength={60} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">Button destination
                        <input name={`${prefix}CtaHref`} defaultValue={banner?.ctaHref || ""} maxLength={160} placeholder="/shop" className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-medium">Image from Media Library
                        <input name={`${prefix}ImagePath`} defaultValue={banner?.imagePath || ""} maxLength={200} placeholder="media/banner.webp" className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                        <span className="text-xs font-normal text-black/50">Upload under Admin → Media, then paste its media path.</span>
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">Mobile layout
                        <select name={`${prefix}MobileLayout`} defaultValue={banner?.mobileLayout || "stacked"} className="min-h-11 rounded-xl border border-black/10 bg-white px-4">
                          <option value="stacked">Stacked image and text</option>
                          <option value="compact">Compact text-first</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">Starts (Bangladesh time)
                        <input type="datetime-local" name={`${prefix}StartAt`} defaultValue={banner?.startAt || ""} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">Ends (Bangladesh time)
                        <input type="datetime-local" name={`${prefix}EndAt`} defaultValue={banner?.endAt || ""} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-sm font-medium">Banner layout
                      <select name={`${prefix}Layout`} defaultValue={banner?.layout || "split"} className="min-h-11 rounded-xl border border-black/10 bg-white px-4">
                        <option value="split">Split — text and action</option>
                        <option value="centered">Centered — compact promotion</option>
                      </select>
                    </label>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-sm font-semibold">Visual section builder</h2>
          <p className="mt-2 text-xs leading-5 text-black/60">Add up to six editorial sections. Choose a type and position, then save to update the live website. Position groups are rendered in the order shown here.</p>
          <div className="mt-5 grid gap-5">
            {Array.from({ length: 6 }, (_, index) => {
              const section = home.editorialSections[index];
              const prefix = `editorial${index}`;
              return <fieldset key={index} className="min-w-0 rounded-2xl border border-black/10 bg-black/[.02] p-4 sm:p-5">
                <legend className="px-2 text-sm font-semibold">Section {index + 1}</legend>
                <div className="grid gap-4">
                  <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name={`${prefix}Enabled`} defaultChecked={section?.enabled || false} /> Show section</label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">Section type
                      <select name={`${prefix}Kind`} defaultValue={section?.kind || "story"} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4">
                        <option value="story">Brand story</option><option value="testimonial">Customer testimonial</option><option value="faq">FAQ highlight</option><option value="announcement">Announcement</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">Position
                      <select name={`${prefix}Position`} defaultValue={section?.position || "after-products"} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4">
                        <option value="before-products">Before product collections</option><option value="after-products">After product collections</option><option value="before-story">Before brand story</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">Layout
                      <select name={`${prefix}Layout`} defaultValue={section?.layout || "split"} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4">
                        <option value="split">Split</option><option value="centered">Centered</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">Small label
                      <input name={`${prefix}Eyebrow`} defaultValue={section?.eyebrow || ""} maxLength={80} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-sm font-medium">Heading
                    <input name={`${prefix}Title`} defaultValue={section?.title || ""} maxLength={160} className="min-h-11 rounded-xl border border-black/10 bg-white px-4" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">Content
                    <textarea name={`${prefix}Copy`} defaultValue={section?.copy || ""} maxLength={800} rows={3} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium">Button text
                      <input name={`${prefix}CtaLabel`} defaultValue={section?.ctaLabel || ""} maxLength={60} className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">Button destination
                      <input name={`${prefix}CtaHref`} defaultValue={section?.ctaHref || ""} maxLength={160} placeholder="/shop" className="min-h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4" />
                    </label>
                  </div>
                </div>
              </fieldset>;
            })}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Brand story</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Eyebrow
              <input name="ideaEyebrow" defaultValue={home.ideaEyebrow} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Headline
              <input name="ideaHeadline" defaultValue={home.ideaHeadline} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Copy
              <textarea name="ideaCopy" defaultValue={home.ideaCopy} rows={4} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard>

        <div className="admin-save-bar">
          <p className="text-xs text-black/60">Saving updates the live storefront immediately.</p>
          <AdminSubmitButton pendingLabel="Saving…">Save changes</AdminSubmitButton>
        </div>
      </form>
    </AdminShell>
  );
}
