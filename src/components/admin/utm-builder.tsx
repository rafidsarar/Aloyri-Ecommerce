"use client";

import { useMemo, useState } from "react";

function clean(value: string) {
  return value.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._+-]/g, "");
}

export function UtmBuilder({ origin }: { origin: string }) {
  const [path, setPath] = useState("/shop");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/shop";
    const built = new URL(safePath, origin);
    const sourceValue = clean(source);
    const mediumValue = clean(medium);
    const campaignValue = clean(campaign);
    if (sourceValue) built.searchParams.set("utm_source", sourceValue);
    if (mediumValue) built.searchParams.set("utm_medium", mediumValue);
    if (campaignValue) built.searchParams.set("utm_campaign", campaignValue);
    return built.toString();
  }, [campaign, medium, origin, path, source]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Destination path
          <input
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder="/shop"
            className="rounded-xl border border-black/10 px-4 py-3"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Source
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="facebook"
            className="rounded-xl border border-black/10 px-4 py-3"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Medium
          <input
            value={medium}
            onChange={(event) => setMedium(event.target.value)}
            placeholder="social"
            className="rounded-xl border border-black/10 px-4 py-3"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Campaign
          <input
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="eid-glow-2026"
            className="rounded-xl border border-black/10 px-4 py-3"
          />
        </label>
      </div>

      <div className="rounded-xl border border-black/8 bg-[#f7f4f2] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-black/38">
          Campaign URL
        </p>
        <p className="mt-2 break-all text-sm text-black/65">{url}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-4 rounded-lg border border-[#713a35]/16 bg-white px-4 py-2 text-xs font-semibold text-[#713a35]"
        >
          {copied ? "Copied" : "Copy URL"}
        </button>
      </div>

      <p className="text-xs leading-5 text-black/42">
        Analytics stores only the sanitized source, medium and campaign labels—not the full visitor URL or query string.
      </p>
    </div>
  );
}
