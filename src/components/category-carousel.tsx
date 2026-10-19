"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function CategoryCarousel({ children, kind = "categories" }: { children: ReactNode; kind?: "categories" | "brands" }) {
  const trackId = kind === "brands" ? "homepage-brand-track" : "homepage-category-track";
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  function updateEdges() {
    const track = trackRef.current;
    if (track) setEdges({ start: track.scrollLeft <= 1, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1 });
  }
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    for (const child of track.children) observer.observe(child);
    return () => observer.disconnect();
  }, [children]);
  function move(direction: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + parseFloat(getComputedStyle(track).columnGap || "0") : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <div className="store-category-carousel" aria-roledescription="carousel" aria-label={`Shop ${kind}`}>
    <div className="mb-3 flex items-center justify-between gap-4">
      <p className="text-xs text-[var(--store-muted)]">Scroll or swipe to browse {kind}</p>
      <div className="flex gap-2">
        <button type="button" aria-label={`Previous ${kind}`} aria-controls={trackId} disabled={edges.start} onClick={() => move(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--store-border)] disabled:opacity-30"><span aria-hidden="true">←</span></button>
        <button type="button" aria-label={`Next ${kind}`} aria-controls={trackId} disabled={edges.end} onClick={() => move(1)} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--store-border)] disabled:opacity-30"><span aria-hidden="true">→</span></button>
      </div>
    </div>
    <div id={trackId} ref={trackRef} className="store-category-gallery" aria-label={`Browse skincare ${kind}`} tabIndex={0} onScroll={updateEdges} onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
    }}>{children}</div>
  </div>;
}
