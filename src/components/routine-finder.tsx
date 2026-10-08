"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ProductCard } from "@/components/product-card";

const steps = [
  { id: "Cleanser", number: "01", label: "Cleanse", description: "Start fresh with a daily face wash.", href: "/category/cleansers" },
  { id: "Moisturizer", number: "02", label: "Moisturize", description: "Choose a moisturizer with a texture you enjoy.", href: "/category/moisturizers" },
  { id: "Sunscreen", number: "03", label: "Protect", description: "Finish your morning routine with sun protection.", href: "/category/sunscreen" },
] as const;

const preferences = [
  { id: "light", label: "Lightweight feel", terms: ["light", "gel", "fluid", "water"] },
  { id: "rich", label: "Rich and comforting", terms: ["rich", "cream", "replenishing"] },
  { id: "simple", label: "No texture preference", terms: [] },
] as const;

export function RoutineFinder() {
  const { products, synced, refreshing, error, refresh } = useCatalog();
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState("Moisturizer");
  const [texture, setTexture] = useState("simple");
  const selectedStep = steps.find(item => item.id === focus) || steps[1];
  const selectedTexture = preferences.find(item => item.id === texture) || preferences[2];

  const recommended = useMemo(() => {
    const matching = products.filter(product => product.active !== false && product.category.toLowerCase() === focus.toLowerCase() && (product.availableStock ?? 0) > 0);
    if (!selectedTexture.terms.length) return matching.slice(0, 6);
    return [...matching].sort((a, b) => {
      const score = (product: typeof a) => {
        const description = [product.name, product.texture, product.description].join(" ").toLowerCase();
        return selectedTexture.terms.reduce((count: number, term: string) => count + Number(description.includes(term)), 0);
      };
      return score(b) - score(a);
    }).slice(0, 6);
  }, [products, focus, selectedTexture]);

  return <main className="shell py-10 md:py-16">
    <nav aria-label="Breadcrumb" className="text-xs text-[#713a35]/65"><Link href="/" className="underline underline-offset-4">Home</Link><span aria-hidden="true"> / </span>Routine finder</nav>
    <div className="mx-auto max-w-3xl py-10 text-center md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#713a35]/65">The Aloyri ritual edit</p>
      <h1 className="display mt-4 text-5xl leading-[1.05] md:text-7xl">Your skincare, made simpler.</h1>
      <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#321f1c]/65 md:text-base">Answer two quick questions and explore products from our live catalog. Recommendations are based on product category and described texture, not a medical skin assessment.</p>
    </div>
    <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#713a35]/12 bg-[#fffdfb] p-5 shadow-sm sm:p-10">
      <div className="flex items-center justify-between gap-4 border-b border-[#713a35]/10 pb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#713a35]">{step === 0 ? "Question 1 of 2" : step === 1 ? "Question 2 of 2" : "Your edit"}</p>
        <div className="flex gap-1.5" aria-hidden="true">{[0, 1, 2].map(index => <span key={index} className={"h-1.5 w-12 rounded-full " + (index <= step ? "bg-[#713a35]" : "bg-[#eadbd5]")} />)}</div>
      </div>
      {step === 0 ? <section className="py-8">
        <h2 className="display text-3xl sm:text-4xl">What would you like to shop for?</h2>
        <p className="mt-3 text-sm text-[#321f1c]/60">Choose one starting point. You can browse the other steps later.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">{steps.map(item => <button type="button" key={item.id} aria-pressed={focus === item.id} onClick={() => setFocus(item.id)} className={"min-h-40 rounded-2xl border p-5 text-left transition " + (focus === item.id ? "border-[#713a35] bg-[#f6e9e2] ring-1 ring-[#713a35]" : "border-[#713a35]/15 bg-white hover:border-[#713a35]/50")}>
          <span className="text-xs text-[#713a35]/65">{item.number}</span><span className="mt-4 block text-xl font-semibold">{item.label}</span><span className="mt-2 block text-sm leading-6 text-[#321f1c]/65">{item.description}</span>
        </button>)}</div>
      </section> : step === 1 ? <section className="py-8">
        <h2 className="display text-3xl sm:text-4xl">Which texture appeals to you?</h2>
        <p className="mt-3 text-sm text-[#321f1c]/60">We'll prioritize matching product descriptions when available.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">{preferences.map(item => <button type="button" key={item.id} aria-pressed={texture === item.id} onClick={() => setTexture(item.id)} className={"min-h-28 rounded-2xl border p-5 text-left text-sm font-semibold transition " + (texture === item.id ? "border-[#713a35] bg-[#f6e9e2] ring-1 ring-[#713a35]" : "border-[#713a35]/15 bg-white hover:border-[#713a35]/50")}>{item.label}</button>)}</div>
      </section> : <section className="py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#713a35]/65">{selectedStep.number} / {selectedStep.label}</p>
        <h2 className="display mt-3 text-3xl sm:text-4xl">Your curated starting point.</h2>
        <p className="mt-3 text-sm leading-7 text-[#321f1c]/65">Explore {selectedStep.label.toLowerCase()} products{texture !== "simple" ? " with your texture preference prioritized" : ""}. Stock, prices and availability are checked against the live catalog.</p>
      </section>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#713a35]/10 pt-6">
        {step > 0 ? <button type="button" onClick={() => setStep(value => value - 1)} className="rounded-full border border-[#713a35]/25 px-6 py-3 text-sm font-semibold">Back</button> : <Link href="/shop" className="text-sm font-semibold text-[#713a35] underline underline-offset-4">Browse everything</Link>}
        {step < 2 ? <button type="button" onClick={() => setStep(value => value + 1)} className="rounded-full bg-[#713a35] px-7 py-3 text-sm font-semibold text-white">{step === 0 ? "Next: texture" : "See your skincare edit"}</button> : <button type="button" onClick={() => {setStep(0);setFocus("Moisturizer");setTexture("simple");}} className="rounded-full bg-[#713a35] px-7 py-3 text-sm font-semibold text-white">Start again</button>}
      </div>
    </div>
    {step === 2 ? <section aria-label="Matching skincare products" className="mt-12 md:mt-16">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#713a35]/60">Explore products</p><h2 className="display mt-2 text-3xl">Available at Aloyri</h2></div><Link href={selectedStep.href} className="rounded-full border border-[#713a35]/20 px-5 py-3 text-sm font-semibold">Shop all {selectedStep.label.toLowerCase()} products</Link></div>
      {!synced ? <div role="status" className="mt-8 rounded-xl bg-[#f6e9e2] p-6 text-sm">{error ? <>Live products could not be loaded. <button type="button" onClick={() => void refresh()} className="underline">Try again</button></> : refreshing ? "Checking current availability…" : "Loading current products…"}</div> : recommended.length ? <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">{recommended.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-8 rounded-xl bg-[#f6e9e2] p-6 text-sm">No in-stock products match this step right now. <Link href="/shop" className="font-semibold underline">Browse all skincare</Link></div>}
      <p className="mt-8 text-xs leading-6 text-[#321f1c]/55">This guide supports product discovery only. Always review the product label and ingredient information, especially if you have sensitive skin or known allergies.</p>
    </section> : null}
  </main>;
}
