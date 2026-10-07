"use client";

import { volatileStorage } from "@/lib/volatile-storage";

import { useEffect, useState } from "react";

const KEY = "aloyri_analytics_disabled";

export function AnalyticsPreference() {
  const [disabled, setDisabled] = useState(false);
  const [dnt, setDnt] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      setDnt(navigator.doNotTrack === "1");
      try {
        setDisabled(volatileStorage.getItem(KEY) === "1");
      } catch {
        setDisabled(false);
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(initialize);
  }, []);

  function update(nextDisabled: boolean) {
    setDisabled(nextDisabled);
    try {
      if (nextDisabled) volatileStorage.setItem(KEY, "1");
      else volatileStorage.removeItem(KEY);
    } catch {
      // Preference still applies for this page even if storage is unavailable.
    }
  }

  return (
    <section className="max-w-3xl rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-6 sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
        Analytics preference
      </p>
      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display text-3xl">Anonymous storefront analytics</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-[#321f1c]/55">
            Aloyri analytics excludes customer identity and free-text fields. You
            can disable these first-party storefront events on this browser.
          </p>
          {dnt ? (
            <p className="mt-2 text-xs font-semibold text-[#713a35]">
              Your browser has Do Not Track enabled, so Aloyri analytics is already suppressed.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!ready || dnt}
          aria-pressed={disabled || dnt}
          onClick={() => update(!disabled)}
          className="min-h-11 shrink-0 rounded-full border border-[#713a35]/15 bg-white px-5 py-3 text-sm font-semibold text-[#713a35] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {dnt || disabled ? "Analytics disabled" : "Disable analytics"}
        </button>
      </div>
    </section>
  );
}
