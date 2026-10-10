"use client";

import { useState, type ReactNode } from "react";

/** Existing Admin hero and active Admin promotional banners share one controlled carousel. */
export function HomepageHeroCarousel({ slides }: { slides: ReactNode[] }) {
  const [active, setActive] = useState(0);
  if (!slides.length) return null;
  return (
    <section className="store-campaign-carousel" aria-roledescription="carousel" aria-label="Featured Aloyri campaigns">
      {slides.map((slide, i) => (
        <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}
          aria-hidden={i !== active} hidden={i !== active}>{slide}</div>
      ))}
      {slides.length > 1 ? <div className="shell flex items-center justify-between gap-3 py-3">
        <span aria-live="polite" className="text-xs font-semibold text-[var(--store-muted)]">{active + 1} / {slides.length}</span>
        <div className="flex items-center gap-2">{slides.map((_, i) => <button key={i} type="button"
          className={`store-campaign-dot ${i === active ? "is-active" : ""}`}
          onClick={() => setActive(i)} aria-label={`Show campaign ${i + 1}`} aria-current={i === active ? "true" : undefined} />)}</div>
        <div className="flex gap-2">
          <button type="button" className="store-campaign-arrow" onClick={() => setActive((active + slides.length - 1) % slides.length)} aria-label="Previous campaign">←</button>
          <button type="button" className="store-campaign-arrow" onClick={() => setActive((active + 1) % slides.length)} aria-label="Next campaign">→</button>
        </div>
      </div> : null}
    </section>
  );
}
