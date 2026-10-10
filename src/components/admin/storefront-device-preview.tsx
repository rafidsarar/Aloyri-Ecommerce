"use client";

import { useState } from "react";
import { BuilderPreviewViewport } from "@/components/admin/builder-preview-viewport";

const devices = [
  { label: "Mobile · 390px", width: 390 },
  { label: "Tablet · 820px", width: 820 },
  { label: "Desktop · 1280px", width: 1280 },
] as const;

/** Saved storefront preview: actual responsive breakpoints, fitted to Admin. */
export function StorefrontDevicePreview({ path = "/" }: { path?: string }) {
  const [width, setWidth] = useState<number>(390);
  const safePath = /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(path) ? path : "/";
  return <div className="min-w-0">
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Preview device">
      {devices.map(device => <button type="button" key={device.width} onClick={() => setWidth(device.width)}
        aria-pressed={width === device.width}
        className={`min-h-11 rounded-xl border px-4 py-2 text-sm ${width === device.width ? "border-[#713a35] bg-[#713a35] text-white" : "border-black/10 bg-white"}`}>
        {device.label}
      </button>)}
    </div>
    <BuilderPreviewViewport width={width} height={780}>
      <iframe key={safePath} title={`Saved storefront at ${width} pixels`} src={safePath}
        width={width} height={780} loading="lazy"
        className="block border-0 bg-white" style={{ width, height: 780, maxWidth: "none" }} />
    </BuilderPreviewViewport>
    <p className="mt-3 text-xs text-black/60">This is the current saved website at its real device width, scaled to fit the Admin panel. Unsaved homepage changes are previewed in the Design canvas.</p>
  </div>;
}
