export type StorefrontEventName =
  | "product_view"
  | "add_to_cart"
  | "checkout_start"
  | "checkout_review"
  | "order_created"
  | "order_tracking_success"
  | "return_request_submitted"
  | "web_vital";

export type StorefrontEventProperties = {
  productId?: string;
  category?: "Cleanser" | "Moisturizer" | "Sunscreen";
  itemCount?: number;
  deliveryZone?: "inside-dhaka" | "outside-dhaka";
  paymentMethod?: "COD";
  orderStatus?: string;
  reason?: string;
  resolution?: string;
  totalBdt?: number;
  metric?: "LCP" | "CLS" | "INP" | "TTFB";
  metricValue?: number;
};

export function trackStorefrontEvent(
  event: StorefrontEventName,
  properties: StorefrontEventProperties = {},
) {
  if (typeof window === "undefined") return;
  if (navigator.doNotTrack === "1") return;

  try {
    if (localStorage.getItem("aloyri_analytics_disabled") === "1") return;
  } catch {
    // Analytics remains anonymous even when storage is unavailable.
  }

  const body = JSON.stringify({ event, properties });
  const blob = new Blob([body], { type: "application/json" });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "omit",
  }).catch(() => undefined);
}
