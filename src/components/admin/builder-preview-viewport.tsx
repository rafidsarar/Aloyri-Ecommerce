"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Keep the embedded storefront at the selected device's true CSS viewport.
 * Scale only its visual presentation to the width available in Admin.
 * Never change the iframe's native width: desktop responsive breakpoints
 * must keep behaving like desktop even when the Admin window is narrow.
 */
export function BuilderPreviewViewport({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? element.clientWidth;
      setAvailableWidth(Math.max(0, Math.floor(measured)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = availableWidth > 0 ? Math.min(1, availableWidth / width) : 1;
  const renderedWidth = width * scale;

  return (
    <div className="min-w-0 w-full" data-builder-device-width={width}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#755f59]">
        <span>Device viewport: {width}px</span>
        <span aria-live="polite">{availableWidth ? `Fit to panel · ${Math.round(scale * 100)}%` : "Fitting preview…"}</span>
      </div>
      <div
        ref={host}
        data-builder-preview-host
        className="relative w-full min-w-0 overflow-hidden rounded-xl bg-[#ede5e0] shadow-inner"
        style={{ height: Math.ceil(height * scale) }}
      >
        <div
          data-builder-preview-content
          className="absolute top-0 overflow-hidden rounded-lg bg-white shadow-md"
          style={{
            left: Math.max(0, (availableWidth - renderedWidth) / 2),
            width,
            height,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
