"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import type { Product } from "@/lib/catalog";

const skinFeel = [
  { value: "dry", label: "Dry or tight", description: "I like a comfortable, nourished feel." },
  { value: "oily", label: "Shiny or oily", description: "I prefer skincare that feels lightweight." },
  { value: "combination", label: "A bit of both", description: "Different areas need different textures." },
  { value: "sensitive", label: "Easily uncomfortable", description: "I prefer a simple, gentle routine." },
  { value: "unsure", label: "Not sure", description: "I'd like to explore the basics first." },
] as const;

const goals = [
  { value: "hydration", label: "Hydration", description: "Soft, comfortable-feeling skin." },
  { value: "lightweight", label: "Light textures", description: "A quick, easy everyday routine." },
  { value: "gentle", label: "Keep it simple", description: "Straightforward skincare steps." },
  { value: "protection", label: "Daily SPF", description: "Build a reliable morning routine." },
] as const;

const steps = [
  { value: "all", label: "Build a three-step routine", description: "Cleanse, moisturize and protect." },
  { value: "cleanser", label: "Find a cleanser", description: "Start with a fresh, comfortable cleanse." },
  { value: "moisturizer", label: "Find a moisturizer", description: "Choose a daily moisturizer." },
  { value: "sunscreen", label: "Find sunscreen", description: "Explore everyday SPF." },
] as const;

type StepValue = typeof steps[number]["value"];
type Feeling = typeof skinFeel[number]["value"];
type Goal = typeof goals[number]["value"];

function productStep(product: Product): Exclude<StepValue, "all"> | null {
  const category = product.category.toLowerCase();
  if (/cleanser|cleansing|wash/.test(category)) return "cleanser";
  if (/moistur|cream|lotion/.test(category)) return "moisturizer";
  if (/sunscreen|sunblock|spf|sun care/.test(category)) return "sunscreen";
  return null;
}

// Score only published editorial copy. This is product discovery, not
// diagnosis or a claim that any item is medically suitable for a skin type.
function scoreProduct(product: Product, goal: Goal, feeling: Feeling) {
  const text = [product.name, product.description, product.texture, product.bestFor, product.skinNote]
    .filter(Boolean).join(" ").toLowerCase();
  const keywords: Record<Goal, string[]> = {
    hydration: ["hydrat", "moistur", "comfort", "nourish"],
    lightweight: ["light", "gel", "weightless", "easy"],
    gentle: ["gentle", "simple", "everyday", "comfortable"],
    protection: ["spf", "uv", "sunscreen", "protect"],
  };
  const feelingKeywords: Record<Feeling, string[]> = {
    dry: ["hydr", "comfort", "nourish"],
    oily: ["light", "gel", "weightless"],
    combination: ["daily", "everyday", "comfortable"],
    sensitive: ["gentle", "simple"],
    unsure: [],
  };
  return keywords[goal].filter((word) => text.includes(word)).length * 3
    + feelingKeywords[feeling].filter((word) => text.includes(word)).length
    + Number(Boolean(product.featured))
    + Number(Boolean(product.bestseller));
}

export function RoutineFinder() {
  const { products, synced, error, refresh } = useCatalog();
  const [question, setQuestion] = useState(0);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [step, setStep] = useState<StepValue | null>(null);
  const isResult = question === 3;
  const options = question === 0 ? skinFeel : question === 1 ? goals : steps;
  const selected = question === 0 ? feeling : question === 1 ? goal : step;

  const recommendations = useMemo(() => {
    if (!isResult || !feeling || !goal || !step || !synced) return [];
    const available = products.filter((product) => (product.availableStock ?? 0) > 0
      && product.merchandisingOutOfStockMode !== "hide");
    const match = (wanted: Exclude<StepValue, "all">) =>
      available.filter((product) => productStep(product) === wanted)
        .sort((a, b) => scoreProduct(b, goal, feeling) - scoreProduct(a, goal, feeling));
    if (step === "all") {
      return (["cleanser", "moisturizer", "sunscreen"] as const)
        .map((kind) => match(kind)[0]).filter((product): product is Product => Boolean(product));
    }
    return match(step).slice(0, 4);
  }, [products, synced, isResult, feeling, goal, step]);

  function answer(value: string) {
    if (question === 0) setFeeling(value as Feeling);
    else if (question === 1) setGoal(value as Goal);
    else setStep(value as StepValue);
  }

  function reset() { setQuestion(0); setFeeling(null); setGoal(null); setStep(null); }

  return (
    <main className="shell py-10 md:py-16">
      <nav aria-label="Breadcrumb" className="store-discovery-muted mb-7 flex items-center gap-2 text-xs">
        <Link href="/">Home</Link><span>/</span><span>Routine finder</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="store-discovery-muted text-xs font-semibold uppercase tracking-[.2em]">Aloyri skincare guide</p>
          <h1 className="store-discovery-title display mt-4 text-5xl leading-[1.05] sm:text-6xl">
            Find your everyday ritual.
          </h1>
          <p className="store-discovery-muted mt-6 max-w-lg text-sm leading-7">
            Answer three quick questions to browse skincare from our current selection.
            There&apos;s no signup, saved quiz profile or personal information required.
          </p>
          <div className="store-discovery-strip mt-8 rounded-2xl p-5">
            <p className="text-sm font-semibold">Simple by design</p>
            <p className="mt-2 text-xs leading-6">Cleanse. Moisturize. Protect with SPF during the day. Explore products at your own pace and always read the label.</p>
          </div>
          <Link href="/shop" className="store-discovery-accent mt-6 inline-block text-sm font-semibold underline underline-offset-4">Or shop all skincare →</Link>
        </div>
        <section aria-label="Routine finder questions" className="store-discovery-panel rounded-[2rem] border p-6 sm:p-9">
          {!isResult ? (
            <>
              <div className="mb-6 flex items-center justify-between gap-3 text-xs">
                <p className="store-discovery-muted font-semibold uppercase tracking-widest">Question {question + 1} of 3</p>
                <span className="store-discovery-muted">Your choices stay on this page</span>
              </div>
              <div aria-hidden="true" className="mb-8 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((value) => <div key={value} className={"h-1.5 rounded-full " + (value <= question ? "store-discovery-progress-active" : "store-discovery-progress")} />)}
              </div>
              <h2 className="display text-3xl sm:text-4xl">{question === 0 ? "How does your skin usually feel?" : question === 1 ? "What matters most in your routine?" : "Where would you like to start?"}</h2>
              <p className="store-discovery-muted mt-3 text-sm leading-6">Choose the option that feels closest. You can change it later.</p>
              <div className="mt-7 grid gap-3">
                {options.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={selected === item.value}
                    onClick={() => answer(item.value)}
                    className={"store-choice w-full rounded-2xl border p-4 text-left transition focus-visible:outline-offset-2 " + (selected === item.value ? "is-selected" : "")}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span aria-hidden="true">{selected === item.value ? "●" : "○"}</span>
                    </span>
                    <span className="store-discovery-muted mt-1 block text-xs leading-5">{item.description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between gap-4">
                <button type="button" className="store-discovery-accent min-h-11 text-sm font-semibold" onClick={() => setQuestion((value) => Math.max(0, value - 1))} disabled={question === 0}>← Back</button>
                <button type="button" disabled={!selected} onClick={() => setQuestion((value) => value + 1)} className="store-discovery-button min-h-12 rounded-full px-7 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">{question === 2 ? "See your picks" : "Continue →"}</button>
              </div>
            </>
          ) : (
            <>
              <p className="store-discovery-muted text-xs font-semibold uppercase tracking-[.2em]">Your skincare edit</p>
              <h2 className="display mt-3 text-4xl">A simple place to begin.</h2>
              <p className="store-discovery-muted mt-4 text-sm leading-7">
                These are shopping suggestions based on Aloyri&apos;s published product descriptions and current stock.
                They are not skin diagnoses or claims of suitability, and availability can change before checkout.
              </p>
              {!synced ? (
                <div role="status" className="store-discovery-strip mt-7 rounded-2xl p-5">
                  <p className="text-sm">{error ? "Live products are temporarily unavailable." : "Checking live products and stock…"}</p>
                  {error ? <button onClick={() => void refresh()} type="button" className="store-discovery-accent mt-3 text-sm font-semibold underline">Try again</button> : null}
                </div>
              ) : recommendations.length ? (
                <div className="mt-7 grid grid-cols-1 gap-7 sm:grid-cols-2">
                  {recommendations.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="store-discovery-strip mt-7 rounded-2xl p-5 text-sm">
                  No matching products are currently in stock. You can explore all skincare instead.
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button type="button" onClick={reset} className="store-discovery-accent min-h-11 text-sm font-semibold underline underline-offset-4">Start again</button>
                <Link href="/shop" className="store-discovery-button inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold">Shop all skincare →</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
