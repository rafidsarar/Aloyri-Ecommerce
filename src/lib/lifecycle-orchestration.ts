import "server-only";

import { cartRecoveryReadiness } from "@/lib/cart-recovery";
import { customerAuthReadiness } from "@/lib/customer-auth";
import { transactionalEmailReadiness } from "@/lib/email-delivery";
import { productAlertsReadiness } from "@/lib/product-alerts";

import {
  lifecyclePolicies,
  type LifecycleTrigger,
} from "@/lib/lifecycle-policy";

export function lifecycleReadiness() {
  const email = transactionalEmailReadiness();
  const lifecycleSwitch = process.env.ALOYRI_LIFECYCLE_EMAIL_ENABLED === "1";
  const crmEventsReady =
    process.env.ALOYRI_CRM_LIFECYCLE_EVENTS_READY === "1" &&
    Boolean(process.env.CRM_INTEGRATION_ID) &&
    Boolean(process.env.CRM_INTEGRATION_SECRET);
  const lifecycleEnabled =
    email.ready && lifecycleSwitch && crmEventsReady;
  const cartRecovery = cartRecoveryReadiness();
  const alerts = productAlertsReadiness();
  const auth = customerAuthReadiness();

  return {
    domainReady: email.domainReady,
    senderReady: email.senderReady,
    lifecycleSwitch,
    crmEventsReady,
    lifecycleEnabled,
    fromEmail: email.fromEmail,
    productAlertsEnabled: alerts.enabled,
    customerAuthEnabled: auth.enabled,
    triggers: {
      "abandoned-cart": cartRecovery.enabled,
      "post-delivery-follow-up": lifecycleEnabled,
      "review-request": lifecycleEnabled,
      "reorder-reminder": lifecycleEnabled,
      "back-in-stock": alerts.enabled,
      "price-drop": alerts.enabled,
    } satisfies Record<LifecycleTrigger, boolean>,
    policies: lifecyclePolicies,
  };
}
