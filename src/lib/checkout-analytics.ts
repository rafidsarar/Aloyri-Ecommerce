import "server-only";

import {
  readAnalyticsEvents,
  type AnalyticsDevice,
  type AnalyticsEventRecord,
} from "@/lib/analytics-store";

function uniqueSessions(
  events: AnalyticsEventRecord[],
  predicate: (event: AnalyticsEventRecord) => boolean,
) {
  return new Set(
    events
      .filter(predicate)
      .map((event) => event.sessionHash)
      .filter((value): value is string => Boolean(value)),
  );
}

function pct(numerator: number, denominator: number) {
  return denominator
    ? Math.round((numerator / denominator) * 10_000) / 100
    : 0;
}

function countsBy(
  events: AnalyticsEventRecord[],
  value: (event: AnalyticsEventRecord) => string | undefined,
) {
  const map = new Map<string, number>();
  for (const event of events) {
    const key = value(event);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export async function buildCheckoutAnalytics(days = 30) {
  const normalizedDays = [1, 7, 30, 90].includes(days) ? days : 30;
  const to = new Date();
  const from = new Date(
    to.getTime() - normalizedDays * 24 * 60 * 60 * 1000,
  );
  const events = await readAnalyticsEvents(from, to);

  const cartSessions = uniqueSessions(
    events,
    (event) =>
      event.event === "cart_view" ||
      event.event === "cart_quantity_change" ||
      event.event === "cart_remove",
  );
  const checkoutSessions = uniqueSessions(
    events,
    (event) => event.event === "checkout_start",
  );
  const reviewSessions = uniqueSessions(
    events,
    (event) => event.event === "checkout_review",
  );
  const submitSessions = uniqueSessions(
    events,
    (event) => event.event === "checkout_submit",
  );
  const orderSessions = uniqueSessions(
    events,
    (event) => event.event === "order_created" && event.confirmed === true,
  );
  const failureSessions = uniqueSessions(
    events,
    (event) => event.event === "checkout_failure",
  );

  const devices: Array<AnalyticsDevice | "unknown"> = [
    "mobile",
    "tablet",
    "desktop",
    "unknown",
  ];

  return {
    range: { days: normalizedDays, from: from.toISOString(), to: to.toISOString() },
    summary: {
      cartSessions: cartSessions.size,
      cartViews: events.filter((event) => event.event === "cart_view").length,
      cartChanges: events.filter(
        (event) => event.event === "cart_quantity_change",
      ).length,
      cartRemovals: events.filter((event) => event.event === "cart_remove").length,
      checkoutStarts: checkoutSessions.size,
      reviewSessions: reviewSessions.size,
      submitSessions: submitSessions.size,
      orderSessions: orderSessions.size,
      failureSessions: failureSessions.size,
      validationErrors: events.filter(
        (event) => event.event === "checkout_validation_error",
      ).length,
      cartToCheckoutRate: pct(checkoutSessions.size, cartSessions.size),
      checkoutToReviewRate: pct(reviewSessions.size, checkoutSessions.size),
      reviewToSubmitRate: pct(submitSessions.size, reviewSessions.size),
      submitToOrderRate: pct(orderSessions.size, submitSessions.size),
      checkoutToOrderRate: pct(orderSessions.size, checkoutSessions.size),
    },
    failures: countsBy(
      events.filter((event) => event.event === "checkout_failure"),
      (event) => event.errorCode,
    ).slice(0, 20),
    fields: countsBy(
      events.filter((event) => event.event === "checkout_validation_error"),
      (event) => event.field,
    ).slice(0, 20),
    devices: devices
      .map((device) => {
        const scoped = events.filter(
          (event) => (event.device || "unknown") === device,
        );
        const starts = uniqueSessions(
          scoped,
          (event) => event.event === "checkout_start",
        ).size;
        const orders = uniqueSessions(
          scoped,
          (event) => event.event === "order_created" && event.confirmed === true,
        ).size;
        return {
          device,
          starts,
          orders,
          conversionRate: pct(orders, starts),
        };
      })
      .filter((row) => row.starts > 0),
  };
}
