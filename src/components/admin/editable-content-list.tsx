"use client";

import { useRef, useState } from "react";

type Item = { question?: string; answer?: string; title?: string; paragraphs?: string[]; bullets?: string[] };
const fieldClass = "rounded-xl border border-black/10 px-4 py-3";

/** Stable row keys preserve unsaved input values when rows are moved or removed. */
export function EditableContentList({ mode, initialItems }: { mode: "faq" | "sections"; initialItems: Item[] }) {
  const [rows, setRows] = useState(() => initialItems.map((item, index) => ({ key: index, item })));
  const nextKey = useRef(initialItems.length);
  const isFaq = mode === "faq";
  const limit = isFaq ? 30 : 12;
  const noun = isFaq ? "question" : "section";
  function changed() {
    document.getElementById("admin-content")?.dispatchEvent(new Event("admin:dirty", { bubbles: true }));
  }
  function move(index: number, direction: number) {
    setRows(previous => {
      const next = [...previous];
      const target = index + direction;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    changed();
  }
  return <section aria-label={isFaq ? "FAQ questions" : "Page sections"} className="space-y-4">
    <input type="hidden" name={isFaq ? "itemCount" : "sectionCount"} value={rows.length} />
    {rows.map(({ key, item }, index) => <article key={key} className="rounded-xl border border-black/10 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{isFaq ? "Question" : "Section"} {index + 1}</h2>
        <div className="flex gap-2">
          <button type="button" disabled={index === 0} aria-label={`Move ${noun} ${index + 1} up`} onClick={() => move(index, -1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-35">↑ Up</button>
          <button type="button" disabled={index === rows.length - 1} aria-label={`Move ${noun} ${index + 1} down`} onClick={() => move(index, 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-35">↓ Down</button>
          <button type="button" aria-label={`Remove ${noun} ${index + 1}`} onClick={() => { setRows(previous => previous.filter(row => row.key !== key)); changed(); }} className="rounded-lg border px-3 py-2 text-xs text-red-700">Remove</button>
        </div>
      </div>
      <div className="grid gap-3">
        {isFaq ? <>
          <label className="grid gap-1.5 text-sm font-medium">Question<input name={`item_${index}_question`} defaultValue={item.question} required maxLength={400} className={fieldClass} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Answer<textarea name={`item_${index}_answer`} defaultValue={item.answer} required rows={3} maxLength={1200} className={fieldClass} /></label>
        </> : <>
          <label className="grid gap-1.5 text-sm font-medium">Section title<input name={`section_${index}_title`} defaultValue={item.title} maxLength={180} className={fieldClass} /></label>
          <label className="grid gap-1.5 text-sm font-medium">Paragraphs<textarea name={`section_${index}_paragraphs`} defaultValue={item.paragraphs?.join("\n")} maxLength={8000} rows={4} className={fieldClass} /><span className="text-xs font-normal text-black/50">One paragraph per line.</span></label>
          <label className="grid gap-1.5 text-sm font-medium">Bullets<textarea name={`section_${index}_bullets`} defaultValue={item.bullets?.join("\n")} maxLength={8000} rows={3} className={fieldClass} /><span className="text-xs font-normal text-black/50">One bullet per line.</span></label>
        </>}
      </div>
    </article>)}
    {!rows.length ? <p className="rounded-xl border border-dashed border-black/15 p-5 text-sm text-black/60">No {isFaq ? "questions" : "sections"} yet. Add one below.</p> : null}
    <button type="button" disabled={rows.length >= limit} onClick={() => { const key = nextKey.current++; setRows(previous => [...previous, { key, item: {} }]); changed(); }} className="rounded-lg border border-[#713a35]/25 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40">+ Add {noun}</button>
    {rows.length >= limit ? <p className="text-xs text-black/50">Maximum {limit} {isFaq ? "questions" : "sections"}.</p> : null}
  </section>;
}
