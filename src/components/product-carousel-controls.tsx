"use client";

type Direction = -1 | 1;

/** Keep carousel navigation alongside the section heading instead of
 * reserving a separate, mostly empty row above the product cards. */
export function ProductCarouselControls({ targetId }: { targetId: string }) {
  const scroll = (direction: Direction) => {
    const viewport = document.getElementById(targetId);
    if (!viewport) return;
    const firstCard = viewport.firstElementChild;
    const width = firstCard?.getBoundingClientRect().width || viewport.clientWidth * 0.8;
    const gap = Number.parseFloat(getComputedStyle(viewport).columnGap) || 16;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollBy({
      left: direction * (width + gap),
      behavior: reduceMotion ? "instant" : "smooth",
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Product carousel navigation">
      <button
        type="button"
        aria-controls={targetId}
        aria-label="Scroll products left"
        onClick={() => scroll(-1)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#713a35]/20 bg-white text-xl text-[#713a35] transition hover:bg-[#713a35]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#713a35]"
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        aria-controls={targetId}
        aria-label="Scroll products right"
        onClick={() => scroll(1)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#713a35]/20 bg-white text-xl text-[#713a35] transition hover:bg-[#713a35]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#713a35]"
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
