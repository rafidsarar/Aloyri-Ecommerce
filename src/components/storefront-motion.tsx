"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for editorial storefront sections. All content
 * remains visible if JavaScript is unavailable or reduced motion is requested.
 * Motion never changes prices, stock, cart state, or form behavior.
 */
export function StorefrontMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-kanva-storefront]");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observed = new WeakSet<Element>();
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("kanva-visible");
          revealObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );
    const observe = () => {
      root.querySelectorAll<HTMLElement>("[data-kanva-reveal]").forEach((element) => {
        if (observed.has(element)) return;
        observed.add(element);
        revealObserver.observe(element);
      });
    };

    root.dataset.motionReady = "true";
    observe();
    const mutationObserver = new MutationObserver(observe);
    mutationObserver.observe(root, { childList: true, subtree: true });

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const viewport = window.innerHeight || 1;
      root.querySelectorAll<HTMLElement>("[data-kanva-rotate], [data-kanva-parallax]").forEach((element) => {
        const box = element.getBoundingClientRect();
        if (box.bottom < 0 || box.top > viewport) return;
        const progress = Math.max(-1, Math.min(1, (viewport / 2 - (box.top + box.height / 2)) / viewport));
        if (element.hasAttribute("data-kanva-rotate")) {
          element.style.setProperty("--kanva-rotation", `${(progress * 18).toFixed(2)}deg`);
        }
        if (element.hasAttribute("data-kanva-parallax")) {
          element.style.setProperty("--kanva-offset", `${(progress * 24).toFixed(1)}px`);
        }
      });
    };
    const requestScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };
    window.addEventListener("scroll", requestScroll, { passive: true });
    window.addEventListener("resize", requestScroll);
    requestScroll();

    return () => {
      delete root.dataset.motionReady;
      mutationObserver.disconnect();
      revealObserver.disconnect();
      window.removeEventListener("scroll", requestScroll);
      window.removeEventListener("resize", requestScroll);
      if (frame) window.cancelAnimationFrame(frame);
      root.querySelectorAll<HTMLElement>("[data-kanva-rotate], [data-kanva-parallax]").forEach((element) => {
        element.style.removeProperty("--kanva-rotation");
        element.style.removeProperty("--kanva-offset");
      });
    };
  }, []);
  return null;
}
