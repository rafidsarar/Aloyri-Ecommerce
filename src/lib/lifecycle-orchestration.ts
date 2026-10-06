import "server-only";

import { cartRecoveryReadiness } from "@/lib/cart-recovery";

function configuredEmail(value: string | undefined) {
  const email = (value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export type LifecycleTrigger =
  | "abandoned-cart"
  | "post-delivery-follow-up"
  | "review-request"
  | "reorder-reminder"
  | "back-in-stock";

export function lifecycleReadiness() {
  const domainReady = process.env.ALOYRI_EMAIL_DOMAIN_VERIFIED === "1";
  const lifecycleSwitch = process.env.ALOYRI_LIFECYCLE_EMAIL_ENABLED === "1";
  const crmEventsReady = process.env.ALOYRI_CRM_LIFECYCLE_EVENTS_READY === "1";
  const fromEmail = configuredEmail(process.env.ALOYRI_LIFECYCLE_FROM_EMAIL);
  const senderReady = Boolean(process.env.RESEND_API_KEY) && Boolean(fromEmail);
  const lifecycleEnabled =
    domainReady && lifecycleSwitch && senderReady && crmEventsReady;
  const cartRecovery = cartRecoveryReadiness();

  return {
    domainReady,
    senderReady,
    lifecycleSwitch,
    crmEventsReady,
    lifecycleEnabled,
    fromEmail: senderReady ? fromEmail : undefined,
    triggers: {
      "abandoned-cart": cartRecovery.enabled,
      "post-delivery-follow-up": lifecycleEnabled,
      "review-request": lifecycleEnabled,
      "reorder-reminder": lifecycleEnabled,
      "back-in-stock": lifecycleEnabled,
    } satisfies Record<LifecycleTrigger, boolean>,
  };
}
