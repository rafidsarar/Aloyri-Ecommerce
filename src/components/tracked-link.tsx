"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import {
  trackStorefrontEvent,
  type AnalyticsClientContext,
  type StorefrontEventName,
  type StorefrontEventProperties,
} from "@/lib/analytics";

export function TrackedLink({
  analyticsEvent,
  analyticsProperties = {},
  analyticsContext = {},
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  analyticsEvent: StorefrontEventName;
  analyticsProperties?: StorefrontEventProperties;
  analyticsContext?: Pick<
    AnalyticsClientContext,
    "collectionId" | "campaignId" | "placementId" | "placementKind" | "searchTerm"
  >;
}) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackStorefrontEvent(
          analyticsEvent,
          analyticsProperties,
          analyticsContext,
        );
        onClick?.(event);
      }}
    />
  );
}
