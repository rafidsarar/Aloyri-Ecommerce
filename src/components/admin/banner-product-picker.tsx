"use client";
import { useMemo, useState } from "react";
import { MAX_HERO_PRODUCTS, normalizeHeroProductIds } from "@/lib/hero-banner-offers";

type ProductOption = { id: string; brand: string; name: string; availableStock?: number };
export function BannerProductPicker({ name, products, selected }: { name: string; products: ProductOption[]; selected: string[] }) {
  const [ids, setIds] = useState(() => normalizeHeroProductIds(selected));
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);
  const visible = useMemo(() => products.filter(product =>
    (product.brand + " " + product.name + " " + product.id).toLowerCase().includes(query.trim().toLowerCase())
  ).slice(0, 40), [products, query]);
  function toggle(id: string) {
    setIds(old => old.includes(id) ? old.filter(value => value !== id) : old.length < MAX_HERO_PRODUCTS ? [...old, id] : old);
  }
  return <div className="rounded-2xl border border-black/10 bg-white p-4">
    <p className="text-sm font-semibold">Sliding products · {ids.length}/{MAX_HERO_PRODUCTS}</p>
    <p className="mt-1 text-xs text-black/55">Products and availability come from CRM. Leave empty to use the main hero image.</p>
    {ids.map(id => <input key={id} type="hidden" name={name} value={id} />)}
    <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
      {ids.map(id => <button type="button" key={id} onClick={() => toggle(id)} aria-label={"Remove " + (byId.get(id)?.name || id)}
        className="rounded-full border border-[#713a35]/25 bg-[#f7ebe6] px-3 py-1.5 text-xs font-semibold text-[#713a35]">
        {byId.get(id)?.name || id} <span aria-hidden="true">×</span>
      </button>)}
    </div>
    <label className="mt-3 grid gap-1 text-xs font-medium">Find products
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product or brand…"
        className="min-h-10 rounded-xl border border-black/15 px-3 text-sm" />
    </label>
    <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-black/10 p-2" aria-label="Product choices">
      {visible.map(product => <label key={product.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs hover:bg-[#f7ebe6]">
        <input type="checkbox" checked={ids.includes(product.id)}
          disabled={!ids.includes(product.id) && ids.length >= MAX_HERO_PRODUCTS} onChange={() => toggle(product.id)} />
        <span className="min-w-0 flex-1"><strong>{product.brand}</strong> · {product.name}</span>
        <span className="text-black/45">{(product.availableStock || 0) > 0 ? "In stock" : "Unavailable"}</span>
      </label>)}
      {!visible.length && <p className="p-2 text-xs text-black/45">{products.length ? "No matches" : "CRM catalog not available; saved selections are retained"}</p>}
    </div>
  </div>;
}
