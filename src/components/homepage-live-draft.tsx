"use client";

import { useEffect, useState, type ReactNode } from "react";
import { VisualBuilderBlock } from "@/components/visual-builder-block";
import type { VisualLayout } from "@/lib/visual-builder";

type DraftMessage = { type: "aloyri-builder-draft"; layout: VisualLayout; coreContent?: Record<string, string> };
type CoreSection = { id: string; content: ReactNode };

export function HomepageLiveDraft({ sections, initialLayout }: { sections: CoreSection[]; initialLayout: VisualLayout }) {
  const [layout, setLayout] = useState(initialLayout);
  const [content, setContent] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.parent === window || new URLSearchParams(window.location.search).get("builderPreview") !== "1") return;
    setActive(true);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const payload = event.data as DraftMessage;
      if (payload?.type !== "aloyri-builder-draft" || !payload.layout || !Array.isArray(payload.layout.order) || !Array.isArray(payload.layout.blocks)) return;
      setLayout(payload.layout);
      setContent(payload.coreContent && typeof payload.coreContent === "object" ? payload.coreContent : {});
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "aloyri-builder-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!active) return;
    const root = document.querySelector("[data-builder-live-draft]");
    if (!root) return;
    const replacements: Record<string, string> = {
      eyebrow: ".store-home-overline",
      headline: ".store-hero-heading",
      intro: ".store-hero-muted",
      primaryLabel: ".store-hero-primary",
      browseTitle: "[data-builder-core='browse'] h2",
      categoriesTitle: "[data-builder-core='categories'] h2",
      routineFinderHeadline: "[data-builder-core='routineFinder'] h2",
      ideaHeadline: "[data-builder-core='brandStory'] h2",
      ideaCopy: "[data-builder-core='brandStory'] p.text-sm",
    };
    // Preview-only text overrides. Real product cards, prices, campaigns and
    // merchandising remain rendered by the storefront's production components.
    for (const [key, selector] of Object.entries(replacements)) {
      const element = root.querySelector(selector);
      if (!element) continue;
      if (!element.hasAttribute("data-builder-original")) element.setAttribute("data-builder-original", element.textContent || "");
      if (typeof content[key] === "string") element.textContent = content[key];
      else element.textContent = element.getAttribute("data-builder-original") || "";
    }
  }, [active, content, layout]);

  const core = new Map(sections.map(section => [`core:${section.id}`, section.content]));
  return <div data-builder-live-draft={active ? "active" : undefined}>
    {layout.order.map(entry => {
      if (entry.startsWith("core:")) {
        const id = entry.slice(5);
        if (layout.hiddenCore.includes(id as VisualLayout["hiddenCore"][number])) return null;
        const element = core.get(entry);
        return element ? <div key={entry} data-builder-core={id}>{element}</div> : null;
      }
      const block = layout.blocks.find(item => entry === `custom:${item.id}`);
      return block ? <div key={entry} data-builder-custom={block.id}><VisualBuilderBlock block={block} /></div> : null;
    })}
    {active && <div className="sr-only" aria-live="polite">{selected}</div>}
  </div>;
}
