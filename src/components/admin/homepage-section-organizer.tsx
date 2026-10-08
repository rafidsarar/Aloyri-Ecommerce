"use client";

import { useState } from "react";
import { defaultHomepageOrder, homepageBlocks, type HomepageBlockId } from "@/lib/homepage-builder";

export function HomepageSectionOrganizer({ initialOrder }: { initialOrder: HomepageBlockId[] }) {
  const [order, setOrder] = useState<HomepageBlockId[]>(initialOrder);
  function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="sectionOrder" value={JSON.stringify(order)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-black/60">Use the arrows to rearrange the entire homepage. Hidden sections retain their positions for later use.</p>
        <button type="button" onClick={() => setOrder([...defaultHomepageOrder])} className="min-h-10 rounded-lg border border-black/15 bg-white px-4 text-xs font-semibold">Restore standard order</button>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {order.map((id, index) => {
          const entry = homepageBlocks.find((item) => item.id === id);
          return (
            <li key={id} className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f5e8e2] text-xs font-bold text-[#713a35]">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry?.label}</span>
                <span className="text-[11px] text-black/50">{entry?.group}</span>
              </span>
              <div className="flex shrink-0 gap-1">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${entry?.label} up`} className="grid h-10 w-10 place-items-center rounded-lg border border-black/15 disabled:opacity-30">↑</button>
                <button type="button" disabled={index === order.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${entry?.label} down`} className="grid h-10 w-10 place-items-center rounded-lg border border-black/15 disabled:opacity-30">↓</button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
