"use client";

import { useEffect, useState, type ReactNode } from "react";
import { VisualBuilderBlock } from "@/components/visual-builder-block";
import type { VisualLayout } from "@/lib/visual-builder";

type DraftMessage = { type: "aloyri-builder-draft"; layout: VisualLayout; coreContent?: Record<string, string>; selectedId?: string };
type CoreSection = { id: string; content: ReactNode };

export function HomepageLiveDraft({ sections, initialLayout }: { sections: CoreSection[]; initialLayout: VisualLayout }) {
  const [layout, setLayout] = useState(initialLayout);
  const [content, setContent] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState("");
  const active = true;

  useEffect(() => {
    if (window.parent === window || new URLSearchParams(window.location.search).get("builderPreview") !== "1") return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const payload = event.data as DraftMessage;
      if (payload?.type !== "aloyri-builder-draft" || !payload.layout || !Array.isArray(payload.layout.order) || !Array.isArray(payload.layout.blocks)) return;
      setLayout(payload.layout);
      setContent(payload.coreContent && typeof payload.coreContent === "object" ? payload.coreContent : {});
      setSelectedId(typeof payload.selectedId === "string" ? payload.selectedId : "");
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "aloyri-builder-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const clickToSelect = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const wrapper = target.closest<HTMLElement>("[data-builder-core], [data-builder-custom]");
      if (!wrapper) return;
      event.preventDefault();
      event.stopPropagation();
      const id = wrapper.dataset.builderCore ? `core:${wrapper.dataset.builderCore}` : `custom:${wrapper.dataset.builderCustom}`;
      window.parent.postMessage({ type: "aloyri-builder-select", id }, window.location.origin);
    };
    document.addEventListener("click", clickToSelect, true);
    return () => document.removeEventListener("click", clickToSelect, true);
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
      secondaryLabel: ".store-hero-secondary",
      browseEyebrow: "[data-builder-core='browse'] .store-home-overline",
      browseIntro: "[data-builder-core='browse'] p",
      categoriesEyebrow: "[data-builder-core='categories'] .store-home-overline",
      categoriesIntro: "[data-builder-core='categories'] p",
      routineFinderIntro: "[data-builder-core='routineFinder'] p",
      ideaEyebrow: "[data-builder-core='brandStory'] .store-home-overline",
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
        return element ? <div key={entry} data-builder-core={id} data-builder-selected={selectedId === entry ? "true" : undefined} className={selectedId === entry ? "outline outline-2 outline-offset-[-2px] outline-[#713a35]" : ""}>{element}</div> : null;
      }
      const block = layout.blocks.find(item => entry === `custom:${item.id}`);
      return block ? <div key={entry} data-builder-custom={block.id} data-builder-selected={selectedId === entry ? "true" : undefined} className={selectedId === entry ? "outline outline-2 outline-offset-[-2px] outline-[#713a35]" : ""}><VisualBuilderBlock block={block} /></div> : null;
    })}
  </div>;
}
