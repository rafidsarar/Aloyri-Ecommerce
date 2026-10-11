import { MediaImagePicker } from "@/components/admin/media-image-picker";
import { BannerProductPicker } from "@/components/admin/banner-product-picker";
import { HomepageSectionOrganizer } from "@/components/admin/homepage-section-organizer";
import { StorefrontDevicePreview } from "@/components/admin/storefront-device-preview";
import { AdminCard } from "@/components/admin/admin-shell";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readStorefrontMediaLibrary, type StorefrontConfig } from "@/lib/storefront-admin-store";

/**
 * All legacy homepage controls rendered inside the Visual Builder's ONE save form.
 * Do not add a nested form or save button here: the unified action persists both
 * advanced homepage fields and visual canvas changes atomically.
 */
export async function HomepageAdvancedControls({ config, inProperties = false }: { config: StorefrontConfig; inProperties?: boolean }) {
  const [catalog, { media, unavailable }] = await Promise.all([fetchCrmCatalog(), readStorefrontMediaLibrary()]);
  const mediaPaths = media.map(item => item.pathname);
  const home = config.homepage;
  const products = catalog.ok ? catalog.body.products : [];
  const heroProductId = products.some(product => product.id === home.heroProductId)
    ? home.heroProductId
    : products.find(product => product.availableStock > 0)?.id || products[0]?.id || "";

  return (
    <div className="space-y-5" aria-label="Existing homepage feature settings">
      {!inProperties && <details className="mb-5 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">Preview live homepage on mobile, tablet or desktop <span className="text-black/40">↓</span></summary>
        <div className="border-t border-black/10 p-4 sm:p-6">
          <StorefrontDevicePreview />
          <p className="mt-2 text-xs text-black/60">Preview shows the current live page. Save changes and refresh the preview to see your update.</p>
        </div>
      </details>}
      <div className="grid gap-5">

        <details id="home-hero" name="homepage-section" className="admin-editor-section" open><summary>Main banner</summary>
        <AdminCard>
          <h2 className="mb-4 text-lg font-semibold">Main banner</h2>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Short label above heading
              <input name="eyebrow" defaultValue={home.eyebrow} maxLength={120} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Headline
              <textarea aria-label="Main banner headline" name="headline" defaultValue={home.headline} rows={3} maxLength={180} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Introduction
              <textarea name="intro" defaultValue={home.intro} rows={4} maxLength={500} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Banner treatment
              <select name="heroStyle" defaultValue={home.heroStyle} className="min-h-11 rounded-xl border border-black/10 px-4">
                <option value="soft">Soft & editorial</option><option value="minimal">Clean minimal</option><option value="contrast">Bold contrast</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">Text alignment
              <select name="heroAlignment" defaultValue={home.heroAlignment} className="min-h-11 rounded-xl border border-black/10 px-4">
                <option value="left">Left aligned</option><option value="center">Centered</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Custom banner image from Media Library
              <MediaImagePicker name="heroImagePath" value={home.heroImagePath} paths={mediaPaths} unavailable={unavailable} />
              <span className="text-xs font-normal text-black/50">Optional. Leave empty to display the featured product. Choose an uploaded image here.</span>
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

          </div>
        </AdminCard>

          <AdminCard>
            <h3 className="text-base font-semibold">Main hero · product slider and 5% offer</h3>
            <p className="mt-2 text-xs text-black/55">Rotate up to six products inside the main banner. Leave empty for the existing main product/image.</p>
            <div className="mt-4"><BannerProductPicker name="heroProductIds" products={products} selected={home.heroProductIds} /></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">Discount mode
                <select name="heroDiscountMode" defaultValue={home.heroDiscountMode} className="min-h-11 rounded-xl border border-black/10 bg-white px-4">
                  <option value="none">No discount</option>
                  <option value="label">5% promotional label only</option>
                  <option value="checkout">5% off at checkout</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">Matching CRM 5% coupon code
                <input name="heroPromotionCode" defaultValue={home.heroPromotionCode} maxLength={40} placeholder="CRM5OFF" className="min-h-11 rounded-xl border border-black/10 bg-white px-4" />
              </label>
            </div>
            <p className="mt-2 text-xs text-black/55">Checkout mode requires an active CRM promotion with a percentage discount of exactly 5%, targeted to these products. CRM applies and validates it during order creation. Label-only never changes prices.</p>
          </AdminCard>
        </details>
<details id="home-order" name="homepage-section" className="admin-editor-section"><summary>Section order</summary>
          <AdminCard>
            <h2 className="text-lg font-semibold">Section layout & order</h2>
            <p className="mt-1 mb-5 text-xs text-black/60">Use the arrows to decide what customers see first. Product groups retain their own order in Sections & Merchandising.</p>
            <HomepageSectionOrganizer initialOrder={home.sectionOrder} />
          </AdminCard>
        </details>
        <details id="home-layout" name="homepage-section" className="admin-editor-section"><summary>Colors, layout & visibility</summary>
        <AdminCard>
          <h2 className="mb-4 text-lg font-semibold">Appearance & section visibility</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showHero" defaultChecked={home.showHero} /> Show main banner</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showBrowse" defaultChecked={home.showBrowse} /> Show search & quick links</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showFocus" defaultChecked={home.showFocus} /> Show skincare focus links</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showRoutineFinder" defaultChecked={home.showRoutineFinder} /> Show guided routine finder</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showRoutineSteps" defaultChecked={home.showRoutineSteps} /> Show three-step routine on homepage</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showRoutine" defaultChecked={config.presentation.showRoutine} /> Enable routine-section layout</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showHeroImageOnMobile" defaultChecked={config.presentation.showHeroImageOnMobile} /> Show hero image on phones</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showCategories" defaultChecked={home.showCategories} /> Show category shortcuts</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showBrandStory" defaultChecked={home.showBrandStory} /> Show brand story</label>
            <label className="grid gap-1 text-sm font-medium">Banner layout
              <select name="heroLayout" defaultValue={home.heroLayout} className="rounded-xl border border-black/10 px-4 py-3">
                <option value="split">Split — text beside product</option>
                <option value="stacked">Stacked — text above product</option>
              </select>
            </label>
          </div>
          <div className="mt-5 grid gap-4 border-t border-black/10 pt-5 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">Color palette
              <select name="appearance" defaultValue={config.site.appearance} className="min-h-11 rounded-xl border border-black/10 px-4 py-3">
                <option value="rose">Rose — Aloyri signature</option>
                <option value="sage">Sage — botanical</option>
                <option value="sand">Sand — warm neutral</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">Content width
              <select name="contentWidth" defaultValue={config.presentation.contentWidth} className="min-h-11 rounded-xl border border-black/10 px-4 py-3">
                <option value="wide">Wide</option><option value="comfortable">Comfortable</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">Desktop product columns
              <select name="desktopColumns" defaultValue={config.presentation.desktopColumns} className="min-h-11 rounded-xl border border-black/10 px-4 py-3">
                <option value="3">Three — larger product images</option><option value="4">Four — more products visible</option>
              </select>
            </label>
          </div>
        </AdminCard>
        </details>
        <details id="home-discovery" name="homepage-section" className="admin-editor-section"><summary>Search, categories & routine finder</summary>
        <AdminCard>
          <h2 className="mb-4 text-lg font-semibold">Search & shopping discovery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Search section label<input name="browseEyebrow" defaultValue={home.browseEyebrow} maxLength={90} className="min-h-11 rounded-xl border border-black/10 px-4" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Search headline<input name="browseTitle" defaultValue={home.browseTitle} maxLength={140} className="min-h-11 rounded-xl border border-black/10 px-4" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Search placeholder<input name="browsePlaceholder" defaultValue={home.browsePlaceholder} maxLength={100} className="min-h-11 rounded-xl border border-black/10 px-4" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Search intro<textarea name="browseIntro" defaultValue={home.browseIntro} maxLength={300} rows={2} className="rounded-xl border border-black/10 px-4 py-3" /></label>
          </div>
          <h3 className="mt-6 border-t border-black/10 pt-5 text-sm font-semibold">Category showcase</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Category label<input name="categoriesEyebrow" defaultValue={home.categoriesEyebrow} maxLength={90} className="min-h-11 rounded-xl border border-black/10 px-4" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Category headline<input name="categoriesTitle" defaultValue={home.categoriesTitle} maxLength={140} className="min-h-11 rounded-xl border border-black/10 px-4" /></label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Category description<textarea name="categoriesIntro" defaultValue={home.categoriesIntro} maxLength={300} rows={2} className="rounded-xl border border-black/10 px-4 py-3" /></label>
          </div>
          <p className="mt-3 text-xs text-black/50">Category photos and availability use your CRM-synced products.</p>
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
        </details>

        <details id="home-banners" name="homepage-section" className="admin-editor-section"><summary>Promotional banners</summary>
        <AdminCard>
          <h2 className="text-lg font-semibold">Promotional banners</h2>
          <p className="mt-2 text-xs leading-5 text-black/60">
            Configure up to four banners, each with its own sliding products and either a 5% label or a CRM-validated 5% discount at checkout.
          </p>
          <label className="mt-5 grid gap-2 text-sm font-medium">Banner placement
            <select name="promoPlacement" defaultValue={home.promoPlacement} className="min-h-11 rounded-xl border border-black/10 px-4">
              <option value="before-products">Before product collections</option>
              <option value="after-products">After product collections</option>
            </select>
          </label>
          <div className="mt-5 grid gap-5">
            {Array.from({ length: 4 }, (_, index) => {
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
                        <MediaImagePicker name={`${prefix}ImagePath`} value={banner?.imagePath || ""} paths={mediaPaths} unavailable={unavailable} />
                        <span className="text-xs font-normal text-black/50">Upload in Images, then select your image here.</span>
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
                    <BannerProductPicker name={`${prefix}ProductIds`} products={products} selected={banner?.productIds || []} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-medium">Discount mode
                        <select name={`${prefix}DiscountMode`} defaultValue={banner?.discountMode || "none"} className="min-h-11 rounded-xl border border-black/10 bg-white px-4">
                          <option value="none">No discount</option>
                          <option value="label">5% promotional label only</option>
                          <option value="checkout">5% off at checkout</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">Matching CRM 5% coupon code
                        <input name={`${prefix}PromotionCode`} defaultValue={banner?.promotionCode || ""} maxLength={40} placeholder="CRM5OFF" className="min-h-11 rounded-xl border border-black/10 bg-white px-4" />
                      </label>
                    </div>
                    <p className="text-xs text-black/55">Checkout mode requires a matching active 5% CRM promotion targeted to these products. Label-only never reduces checkout prices.</p>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </AdminCard>

        </details>
        <details id="home-editorial" name="homepage-section" className="admin-editor-section"><summary>Editorial sections</summary>
        <AdminCard>
          <h2 className="text-lg font-semibold">Visual section builder</h2>
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

        </details>
        <details id="home-story" name="homepage-section" className="admin-editor-section"><summary>Brand story</summary>
        <AdminCard>
          <p className="text-lg font-semibold">Brand story</p>
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

        </details>

      </div>
    </div>
  );
}
