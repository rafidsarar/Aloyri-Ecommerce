"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import "./storefront-motion.css";

/** Progressive enhancement: content remains visible without JavaScript. */
export function StorefrontMotion({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (preference.matches) return;
      const scenes = [...node.querySelectorAll<HTMLElement>("[data-motion-scene]")];
      const reveals = [...node.querySelectorAll<HTMLElement>("[data-text-reveal]")];
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "true");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      reveals.forEach(element => {
        // Never hide content already visible, including restored scroll positions.
        const rect = element.getBoundingClientRect();
        element.dataset.revealed = rect.top < innerHeight && rect.bottom > 0 ? "true" : "false";
        observer.observe(element);
      });
      node.dataset.motion = "enabled";
      let frame = 0;
      const update = () => {
        frame = 0;
        scenes.forEach(scene => {
          const rect = scene.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > innerHeight + 100) return;
          const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight));
          scene.style.setProperty("--drift", `${progress * 100}px`);
          scene.style.setProperty("--turn", `${progress * 32}deg`);
        });
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
      const pointer = (event: PointerEvent) => {
        if (!fine.matches) return;
        const scene = (event.target as Element).closest<HTMLElement>("[data-motion-scene]");
        if (!scene || !node.contains(scene)) return;
        const rect = scene.getBoundingClientRect();
        scene.style.setProperty("--pointer-x", `${((event.clientX - rect.left) / rect.width - .5) * 16}px`);
        scene.style.setProperty("--pointer-y", `${((event.clientY - rect.top) / rect.height - .5) * 16}px`);
      };
      const reset = () => scenes.forEach(scene => {
        scene.style.removeProperty("--pointer-x");
        scene.style.removeProperty("--pointer-y");
      });
      update();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      node.addEventListener("pointermove", pointer, { passive: true });
      node.addEventListener("pointerleave", reset);
      dispose = () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        node.removeEventListener("pointermove", pointer);
        node.removeEventListener("pointerleave", reset);
        delete node.dataset.motion;
        scenes.forEach(scene => ["--drift", "--turn", "--pointer-x", "--pointer-y"].forEach(name => scene.style.removeProperty(name)));
      };
    };
    setup();
    preference.addEventListener("change", setup);
    return () => { dispose(); preference.removeEventListener("change", setup); };
  }, []);
  return <div ref={root} className={`store-motion ${className}`}>{children}</div>;
}

export function RevealText({ children }: { children: string }) {
  return <span data-text-reveal>{children.split(" ").map((word, index) => <span className="reveal-word" style={{ "--word": Math.min(index, 12) } as CSSProperties} key={`${index}-${word}`}>{word}{" "}</span>)}</span>;
}

/** Decorative botanical silhouette, with independent pointer depths. */
export function BotanicalScene() {
  return <div className="botanical-scene" data-motion-scene aria-hidden="true">
    <div className="motion-halo motion-background" />
    <div className="botanical-stem motion-midground"><i /><i /><i /><i /></div>
    <div className="botanical-orbit motion-foreground"><span className="motion-rotate">✳</span></div>
    <span className="botanical-caption">A little care, every day.</span>
  </div>;
}
