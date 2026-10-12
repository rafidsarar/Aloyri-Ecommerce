"use client";

import { useState } from "react";

export function HeroBackgroundField({ name, label, value = "", fallbackLabel = "Use default background" }: { name: string; label: string; value?: string; fallbackLabel?: string }) {
  const [color, setColor] = useState(value);
  return <fieldset className="rounded-xl border border-black/10 p-4">
    <legend className="px-1 text-sm font-medium">{label}</legend>
    <input type="hidden" name={name} value={color} />
    <div className="flex flex-wrap items-center gap-3">
      <input type="color" aria-label={label} value={color || "#f7efeb"} onChange={event => setColor(event.target.value)} className="h-11 w-16 cursor-pointer rounded border border-black/10" />
      <span className="text-sm">{color || fallbackLabel}</span>
      <button type="button" onClick={() => setColor("")} className="min-h-11 rounded-lg border border-black/15 px-3 text-sm">{fallbackLabel}</button>
    </div>
  </fieldset>;
}
