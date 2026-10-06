"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import {
  trackStorefrontEvent,
  type AnalyticsClientContext,
  type StorefrontEventName,
  type StorefrontEventProperties,
} from "@/lib/analytics";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previous = useRef("");

  useEffect(() => {
    const key = pathname + "?" + searchParams.toString();
    if (previous.current === key) return;
    previous.current = key;
    trackStorefrontEvent("page_view");
  }, [pathname, searchParams]);

  return null;
}

export function StorefrontAnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}

export function AnalyticsViewTracker({
  event,
  properties = {},
  context = {},
}: {
  event: StorefrontEventName;
  properties?: StorefrontEventProperties;
  context?: Pick<
    AnalyticsClientContext,
    "collectionId" | "campaignId" | "placementId" | "placementKind" | "searchTerm"
  >;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackStorefrontEvent(event, properties, context);
  }, [context, event, properties]);

  return null;
}
