"use client";

import { useState } from "react";

const devices = [
  { label: "Mobile · 320px", width: 320 },
  { label: "Mobile · 390px", width: 390 },
  { label: "Tablet · 768px", width: 768 },
  { label: "Desktop · 1280px", width: 1280 },
] as const;

export function StorefrontDevicePreview() {
  const [width, setWidth] = useState<number>(390);
  return <div className="min-w-0">
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Preview device">
      {devices.map(device => <button type="button" key={device.width} onClick={() => setWidth(device.width)}
        aria-pressed={width === device.width}
        className={`min-h-11 rounded-xl border px-4 py-2 text-sm ${width === device.width ? "border-[#713a35] bg-[#713a35] text-white" : "border-black/10 bg-white"}`}>
        {device.label}
      </button>)}
    </div>
    <div className="w-full overflow-x-auto rounded-2xl border border-black/10 bg-[#ece4e0] p-3 sm:p-6">
      <iframe title={`Storefront draft at ${width} pixels`} src="/" width={width} height={780}
        className="mx-auto block max-w-none rounded-xl border border-black/10 bg-white shadow-lg" style={{ width, height: 780 }} />
    </div>
    <p className="mt-3 text-xs text-black/60">The frame uses your private draft preview session. Customers still see the published storefront until you publish.</p>
  </div>;
}
