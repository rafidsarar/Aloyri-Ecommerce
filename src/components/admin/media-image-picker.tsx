"use client";

import Image from "next/image";
import { useState } from "react";

export function MediaImagePicker({ name, value, paths, unavailable = false }: { name: string; value: string; paths: string[]; unavailable?: boolean }) {
  const [selected, setSelected] = useState(value);
  const options = [...new Set([value, ...paths].filter(Boolean))];
  return <span className="grid min-w-0 gap-3">
    <select name={name} value={selected} onChange={event => setSelected(event.target.value)} className="min-h-11 min-w-0 max-w-full rounded-xl border border-black/10 bg-white px-3 text-sm">
      <option value="">No custom image</option>
      {options.map(path => <option key={path} value={path}>{path.replace(/^media\//, "")}</option>)}
    </select>
    {selected ? <Image src={"/api/storefront-media/" + selected.replace(/^media\//, "")} alt="Selected banner image" width={320} height={180} className="h-32 w-full rounded-lg border border-black/10 bg-[#f7f4f2] object-contain" /> : null}
    {unavailable ? <span role="alert" className="text-xs font-normal text-amber-800">The image library is temporarily unavailable. Your current selection is preserved.</span> : null}
  </span>;
}
