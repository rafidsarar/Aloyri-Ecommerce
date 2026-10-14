"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play, ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import { sellingProducts } from "@/lib/homepage-selling-products";

const SPEED_PIXELS_PER_SECOND = 34;

/** Ping-pong autoplay: rightward until the last card, then back toward the first. */
export function HomepageSellingProductsCarousel({
  placementId,
}: {
  placementId: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const { products, synced, error } = useCatalog();
  const available = useMemo(() => synced ? sellingProducts(products) : [], [products, synced]);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [edges, setEdges] = useState({ first: true, last: true });

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const first = track.scrollLeft <= 2;
    const last = track.scrollLeft >= max - 2;
    setEdges((current) => current.first === first && current.last === last
      ? current : { first, last });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const resize = new ResizeObserver(updateEdges);
    resize.observe(track);
    for (const child of track.children) resize.observe(child);
    updateEdges();
    return () => resize.disconnect();
  }, [available.length, updateEdges]);

  const autoMoving = synced && available.length > 1 && visible &&
    !paused && !hovered && !focusWithin && !reducedMotion;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !autoMoving) return;
    let frame = 0;
    let direction = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2 ? -1 : 1;
    let previousTime = 0;

    const move = (now: number) => {
      if (previousTime) {
        // Clamp large frame gaps so returning to a background tab never jumps ahead.
        const dt = Math.min(64, now - previousTime);
        const max = Math.max(0, track.scrollWidth - track.clientWidth);
        if (max > 2 && document.visibilityState === "visible") {
          const position = track.scrollLeft + direction * SPEED_PIXELS_PER_SECOND * dt / 1000;
          if (position >= max) {
            track.scrollLeft = max;
            direction = -1;
          } else if (position <= 0) {
            track.scrollLeft = 0;
            direction = 1;
          } else {
            track.scrollLeft = position;
          }
        }
      }
      previousTime = now;
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [autoMoving, available.length]);

  const moveByCard = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    setPaused(true);
    const card = track.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const distance = card ? card.offsetWidth + gap : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * distance, behavior: reducedMotion ? "instant" : "smooth" });
  };

  return (
    <div className="home-selling-carousel" role="region" aria-roledescription="carousel"
      aria-label="All available skincare products">
      <div className="home-selling-carousel-controls">
        <p className="text-xs text-[var(--store-muted)]">
          Browse every available product. Swipe, use the arrows, or pause the glide.
        </p>
        <div className="home-selling-carousel-buttons">
          <button type="button" aria-label="Previous products" aria-controls={trackId}
            disabled={!synced || edges.first} onClick={() => moveByCard(-1)}
            className="home-selling-control">
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next products" aria-controls={trackId}
            disabled={!synced || edges.last} onClick={() => moveByCard(1)}
            className="home-selling-control">
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button type="button" aria-controls={trackId}
            aria-label={reducedMotion ? "Automatic scrolling disabled by reduced-motion preference"
              : paused ? "Resume automatic product scrolling" : "Pause automatic product scrolling"}
            aria-pressed={paused} disabled={reducedMotion || available.length < 2}
            onClick={() => setPaused(value => !value)}
            className="home-selling-control home-selling-play-control">
            {paused || reducedMotion ? <Play size={16} aria-hidden="true" /> :
              <Pause size={16} aria-hidden="true" />}
            <span>{reducedMotion ? "Motion off" : paused ? "Play" : "Pause"}</span>
          </button>
        </div>
      </div>
      {synced && available.length ? (
        <div id={trackId} ref={trackRef} className="home-selling-carousel-track"
          tabIndex={0} aria-label="Browse all products in stock" aria-live="off"
          onScroll={updateEdges}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocusWithin(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
          }}
          onPointerDown={() => setPaused(true)}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              moveByCard(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}>
          {available.map((product) => (
            <div className="home-selling-carousel-item" key={product.id}>
              <ProductCard product={product} placementId={placementId} placementKind="all-products" />
            </div>
          ))}
        </div>
      ) : (
        <div className="home-selling-carousel-empty" role="status">
          {synced ? "No products are currently in stock."
            : error ? "Live products are temporarily unavailable. Please visit the shop later."
              : "Checking the latest products and availability…"}
        </div>
      )}
    </div>
  );
}
