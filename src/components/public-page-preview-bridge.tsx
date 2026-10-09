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
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
