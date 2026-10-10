"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const SLIDE_INTERVAL_MS = 6500;

/**
 * Compact, swipeable campaign rail. The primary Admin hero, scheduled Admin
 * banners, and (when empty) evergreen discovery cards share the same controls.
 * Native scroll-snap provides touch swiping without an extra dependency.
 */
export function HomepageHeroCarousel({ slides }: { slides: ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track || count < 1) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const first = cards[0];
    const target = cards[(index + count) % count];
    if (!first || !target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: reduced ? "auto" : "smooth" });
    setActive((index + count) % count);
  }, [count]);

  // Respect reduced-motion, background tabs, and user hover/focus/touch.
  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => {
      if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      goTo(active + 1);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active, count, goTo, paused]);

  function syncVisibleSlide() {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const first = cards[0];
    if (!first) return;
    const closest = cards.reduce((best, card, index) => {
      // The final card cannot always snap flush-left when a neighboring card
      // is visible. Compare card centers with the viewport center instead.
      const position = card.offsetLeft - first.offsetLeft - track.scrollLeft + card.offsetWidth / 2 - track.clientWidth / 2;
      const previous = cards[best].offsetLeft - first.offsetLeft - track.scrollLeft + cards[best].offsetWidth / 2 - track.clientWidth / 2;
      return Math.abs(position) < Math.abs(previous) ? index : best;
    }, 0);
    setActive(current => current === closest ? current : closest);
  }

  if (!count) return null;

  return (
    <section className="shell store-campaign-carousel pt-4 md:pt-6"
      aria-label="Featured Aloyri campaigns" aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
      onKeyDown={event => {
        if (count < 2) return;
        if (event.key === "ArrowRight") { event.preventDefault(); goTo(active + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); goTo(active - 1); }
      }}>
      <div className="store-campaign-track" ref={trackRef} onScroll={syncVisibleSlide}
        aria-label="Swipe to explore featured banners" tabIndex={0}>
        {slides.map((slide, index) => (
          <div className="store-campaign-slide" key={index} role="group"
            aria-roledescription="slide" aria-label={String(index + 1) + " of " + String(count)}>
            {slide}
          </div>
        ))}
      </div>
      {count > 1 ? (
        <div className="store-campaign-controls flex items-center justify-between gap-3 py-3 md:py-4">
          <p className="text-xs font-semibold text-[var(--store-muted)]" aria-live="polite">
            <span className="sr-only">Banner </span>{active + 1} / {count}
          </p>
          <div className="flex items-center gap-2" aria-label="Choose featured banner">
            {slides.map((_, index) => (
              <button type="button" key={index}
                className={"store-campaign-dot" + (active === index ? " is-active" : "")}
                onClick={() => goTo(index)}
                aria-label={"Show campaign " + (index + 1)}
                aria-current={active === index ? "true" : undefined} />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="store-campaign-arrow" onClick={() => goTo(active - 1)}
              aria-label="Previous campaign"><span aria-hidden="true">←</span></button>
            <button type="button" className="store-campaign-arrow" onClick={() => goTo(active + 1)}
              aria-label="Next campaign"><span aria-hidden="true">→</span></button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
