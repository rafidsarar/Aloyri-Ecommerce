import { saveHomepage } from "@/app/admin/actions";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export default async function AdminHomepagePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireAdminPage();
  const [{ saved }, config, catalog] = await Promise.all([
    searchParams,
    readStorefrontConfig(),
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
      subtitle="Manage hero messaging, calls to action and the featured product without touching CRM."
    >
      {saved ? <AdminNotice>Homepage changes saved.</AdminNotice> : null}
      <form action={saveHomepage} className="grid gap-5">
        <AdminCard>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Eyebrow
              <input name="eyebrow" defaultValue={home.eyebrow} maxLength={120} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Headline
              <textarea name="headline" defaultValue={home.headline} rows={3} maxLength={180} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Intro
              <textarea name="intro" defaultValue={home.intro} rows={4} maxLength={500} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <AdminCard>
            <p className="text-sm font-semibold">Primary call to action</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Label
                <input name="primaryLabel" defaultValue={home.primaryLabel} maxLength={80} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Internal URL
                <input name="primaryHref" defaultValue={home.primaryHref} maxLength={200} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
            </div>
          </AdminCard>

          <AdminCard>
            <p className="text-sm font-semibold">Secondary call to action</p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Label
                <input name="secondaryLabel" defaultValue={home.secondaryLabel} maxLength={80} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Internal URL
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
              Feature chips
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
          <p className="text-sm font-semibold">Brand story block</p>
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

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save homepage
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
