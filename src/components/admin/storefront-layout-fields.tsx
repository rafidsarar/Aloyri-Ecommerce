import type { StorefrontPresentation } from "@/lib/storefront-presentation";

export function StorefrontLayoutFields({ value }: { value: StorefrontPresentation }) {
  const options = [
    ["showAnnouncement", "Show announcement bar"],
    ["stickyHeader", "Keep navigation visible while scrolling"],
    ["showRoutine", "Show the three-step routine section"],
    ["showHeroImageOnMobile", "Show banner product image on phones"],
  ] as const;
  return <>
    <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold">Layout & browsing</h2>
      <p className="mt-2 text-xs leading-5 text-black/60">Changes are saved to your draft. Mobile product grids keep two columns.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Page width
          <select name="contentWidth" defaultValue={value.contentWidth} className="min-h-11 rounded-xl border border-black/10 px-3">
            <option value="wide">Wide — more room for products</option><option value="comfortable">Comfortable — focused reading</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">Products per row on desktop
          <select name="desktopColumns" defaultValue={value.desktopColumns} className="min-h-11 rounded-xl border border-black/10 px-3"><option value="3">3 — larger product cards</option><option value="4">4 — more products at a glance</option></select>
        </label>
        {options.map(([name,label])=><label key={name} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name={name} defaultChecked={value[name]} className="h-4 w-4" />{label}</label>)}
      </div>
    </section>
    <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold">Main navigation</h2>
      <p className="mt-2 text-xs leading-5 text-black/60">Up to five links, shown in this order. Leave both fields blank to remove an item. Account, cart and tracking remain easy to find.</p>
      <div className="mt-5 grid gap-4">{Array.from({length:5},(_,i)=><div key={i} className="grid gap-3 rounded-xl bg-black/[.025] p-3 sm:grid-cols-2">
        <label className="grid gap-2 text-xs font-medium">Menu item {i+1} label<input name={`navLabel${i}`} defaultValue={value.navigation[i]?.label || ""} maxLength={30} className="min-h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm" /></label>
        <label className="grid gap-2 text-xs font-medium">Menu item {i+1} destination<input name={`navHref${i}`} defaultValue={value.navigation[i]?.href || ""} maxLength={160} placeholder="/shop" className="min-h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm" /></label>
      </div>)}</div>
      <p className="mt-4 text-xs leading-6 text-black/60">Use /shop, /shop?sort=bestseller, /routine-finder, /category/cleansers, /category/moisturizers, /category/sunscreen, /collections/your-slug, /about, /contact, /faq, /shipping-delivery or /returns-refunds.</p>
    </section>
  </>;
}
