"use client";

import { useEffect } from "react";
import { trackStorefrontEvent } from "@/lib/analytics";

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type InteractionEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
};

export function PerformanceReporter() {
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigation?.responseStart) {
      trackStorefrontEvent("web_vital", {
        metric: "TTFB",
        metricValue: navigation.responseStart,
      });
    }

    let lcp = 0;
    let cls = 0;
    let inp = 0;
    let reported = false;
    const observers: PerformanceObserver[] = [];

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries.at(-1);
        if (last) lcp = last.startTime;
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch {
      // Metric unsupported in this browser.
    }

    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) cls += entry.value;
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);
    } catch {
      // Metric unsupported in this browser.
    }

    try {
      const interactionObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as InteractionEntry[]) {
          if ((entry.interactionId ?? 0) > 0) {
            inp = Math.max(inp, entry.duration);
          }
        }
      });
      interactionObserver.observe({ type: "event", buffered: true });
      observers.push(interactionObserver);
    } catch {
      // Metric unsupported in this browser.
    }

    const report = () => {
      if (reported) return;
      reported = true;
      if (lcp > 0) {
        trackStorefrontEvent("web_vital", {
          metric: "LCP",
          metricValue: lcp,
        });
      }
      trackStorefrontEvent("web_vital", {
        metric: "CLS",
        metricValue: cls,
      });
      if (inp > 0) {
        trackStorefrontEvent("web_vital", {
          metric: "INP",
          metricValue: inp,
        });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") report();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);

    return () => {
      report();
      observers.forEach((observer) => observer.disconnect());
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
    };
  }, []);

  return null;
}
