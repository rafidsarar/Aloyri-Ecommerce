"use client";

import { useEffect } from "react";

/** Safe same-origin editing bridge for the Builder's public-page iframe. */
export function PublicPagePreviewBridge() {
  useEffect(() => {
    if (window.parent === window || new URLSearchParams(window.location.search).get("builderPreview") !== "1") return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const part = target.closest("header, footer, main, [aria-label='Additional page content']");
      if (!part) return;
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage({
        type: "aloyri-builder-public-select",
        section: part.matches("header") ? "header" : part.matches("footer") ? "footer" : "page",
      }, window.location.origin);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== "aloyri-builder-page-draft") return;
      const site = event.data.siteContent as { announcement?: string; footerDescription?: string } | undefined;
      if (site) {
        const footer = document.querySelector(".store-footer-description");
        if (footer && typeof site.footerDescription === "string") footer.textContent = site.footerDescription;
        const announcement = document.querySelector("[data-storefront-announcement]");
        if (announcement && typeof site.announcement === "string") announcement.textContent = site.announcement;
      }
      const content = event.data.content as { eyebrow?: string; title?: string; intro?: string; sections?: { title?: string }[] } | undefined;
      if (!content) return;
      const main = document.querySelector("main");
      if (!main) return;
      const heading = main.querySelector("h1");
      const eyebrow = heading?.previousElementSibling;
      const intro = heading?.nextElementSibling;
      const update = (element: Element | null | undefined, value: unknown) => {
        if (element && typeof value === "string") element.textContent = value;
      };
      update(heading, content.title);
      update(eyebrow, content.eyebrow);
      update(intro, content.intro);
      main.querySelectorAll("[id^='care-section-'] h2").forEach((heading, index) => update(heading, content.sections?.[index]?.title));
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("message", onMessage); };
  }, []);
  return null;
}
