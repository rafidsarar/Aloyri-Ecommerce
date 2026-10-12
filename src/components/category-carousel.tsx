"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function CategoryCarousel({ children }: { children: ReactNode }) {
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
  return <div className="store-category-carousel" aria-roledescription="carousel" aria-label="Shop categories">
    <div className="mb-3 flex items-center justify-between gap-4">
      <p className="text-xs text-[var(--store-muted)]">Scroll or swipe to browse categories</p>
      <div className="flex gap-2">
        <button type="button" aria-label="Previous categories" aria-controls="homepage-category-track" disabled={edges.start} onClick={() => move(-1)} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--store-border)] disabled:opacity-30"><span aria-hidden="true">←</span></button>
        <button type="button" aria-label="Next categories" aria-controls="homepage-category-track" disabled={edges.end} onClick={() => move(1)} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--store-border)] disabled:opacity-30"><span aria-hidden="true">→</span></button>
      </div>
    </div>
    <div id="homepage-category-track" ref={trackRef} className="store-category-gallery" aria-label="Browse skincare categories" tabIndex={0} onScroll={updateEdges} onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
    }}>{children}</div>
  </div>;
}
