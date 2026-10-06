import "server-only";

import {
  readAnalyticsEvents,
  type AnalyticsEventRecord,
} from "@/lib/analytics-store";
import { listProductReviews } from "@/lib/review-store";
import {
  customerLifecycleState,
  type CustomerLifecycleState,
} from "@/lib/retention-utils";

function pct(numerator: number, denominator: number) {
  return denominator
    ? Math.round((numerator / denominator) * 10_000) / 100
    : 0;
}

function average(values: number[]) {
  return values.length
    ? Math.round(
        (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
      ) / 100
    : 0;
}

function sessionConversion(
  events: AnalyticsEventRecord[],
  sourceEvent: AnalyticsEventRecord["event"],
) {
  const sources = new Set(
    events
      .filter((event) => event.event === sourceEvent && event.sessionHash)
      .map((event) => event.sessionHash as string),
  );
  const orders = new Set(
    events
      .filter(
        (event) =>
          event.event === "order_created" &&
          event.confirmed &&
          event.sessionHash &&
          sources.has(event.sessionHash),
      )
      .map((event) => event.sessionHash as string),
  );
  return {
    sessions: sources.size,
    orderSessions: orders.size,
    conversionRate: pct(orders.size, sources.size),
  };
}

export async function buildRetentionAnalytics(days = 30) {
  const normalizedDays = [7, 30, 90].includes(days) ? days : 30;
  const now = new Date();
  const from = new Date(
    now.getTime() - normalizedDays * 24 * 60 * 60 * 1000,
  );
  const historyFrom = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  );

  const [events, reviews] = await Promise.all([
    readAnalyticsEvents(historyFrom, now),
    listProductReviews(),
  ]);

  const orders = events
    .filter(
      (event) =>
        event.event === "order_created" &&
        event.confirmed === true &&
        Boolean(event.customerHash),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const currentEvents = events.filter(
    (event) => Date.parse(event.timestamp) >= from.getTime(),
  );
  const currentOrders = orders.filter(
    (event) => Date.parse(event.timestamp) >= from.getTime(),
  );

  const byCustomer = new Map<string, AnalyticsEventRecord[]>();
  for (const order of orders) {
    const key = order.customerHash as string;
    const rows = byCustomer.get(key) || [];
    rows.push(order);
    byCustomer.set(key, rows);
  }

  let firstTimeOrders = 0;
  let repeatOrders = 0;
  for (const order of currentOrders) {
    const rows = byCustomer.get(order.customerHash as string) || [];
    const index = rows.findIndex((row) => row.id === order.id);
    if (index <= 0) firstTimeOrders += 1;
    else repeatOrders += 1;
  }

  const gaps: number[] = [];
  const repeatCustomerHashes = new Set<string>();
  const lifecycle: Record<CustomerLifecycleState, number> = {
    New: 0,
    Active: 0,
    "Reorder due": 0,
    Returning: 0,
    "At risk": 0,
    "Re-engaged": 0,
  };
  const repeatProducts = new Map<
    string,
    { units: number; customers: Set<string>; orders: number }
  >();

  for (const [customerHash, rows] of byCustomer) {
    const sorted = [...rows].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    if (sorted.length >= 2) repeatCustomerHashes.add(customerHash);
    for (let index = 1; index < sorted.length; index += 1) {
      gaps.push(
        (Date.parse(sorted[index].timestamp) -
          Date.parse(sorted[index - 1].timestamp)) /
          (24 * 60 * 60 * 1000),
      );
      for (const item of sorted[index].items || []) {
        const current = repeatProducts.get(item.productId) || {
          units: 0,
          customers: new Set<string>(),
          orders: 0,
        };
        current.units += item.qty;
        current.customers.add(customerHash);
        current.orders += 1;
        repeatProducts.set(item.productId, current);
      }
    }

    const state = customerLifecycleState(
      sorted.map((row) => row.timestamp),
      [],
      now,
    );
    lifecycle[state] += 1;
  }

  const combinations = new Map<string, number>();
  for (const order of orders) {
    const ids = [...new Set((order.items || []).map((item) => item.productId))].sort();
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const key = ids[i] + "|" + ids[j];
        combinations.set(key, (combinations.get(key) || 0) + 1);
      }
    }
  }

  const approvedReviews = reviews.filter(
    (review) => review.status === "approved" && review.customerHash,
  );
  const reviewedCustomers = new Set(
    approvedReviews.map((review) => review.customerHash as string),
  );
  const reviewRepeatCustomers = new Set<string>();
  for (const review of approvedReviews) {
    const rows = byCustomer.get(review.customerHash as string) || [];
    if (
      rows.some(
        (order) =>
          Date.parse(order.timestamp) > Date.parse(review.createdAt),
      )
    ) {
      reviewRepeatCustomers.add(review.customerHash as string);
    }
  }

  const reorder = sessionConversion(currentEvents, "reorder_add_to_cart");
  const wishlist = sessionConversion(currentEvents, "wishlist_move_to_cart");

  const activeCurrentCustomers = new Set(
    currentOrders.map((order) => order.customerHash as string),
  );
  const returningCurrentCustomers = new Set(
    currentOrders
      .filter((order) => {
        const rows = byCustomer.get(order.customerHash as string) || [];
        return rows.findIndex((row) => row.id === order.id) > 0;
      })
      .map((order) => order.customerHash as string),
  );

  return {
    range: {
      days: normalizedDays,
      from: from.toISOString(),
      to: now.toISOString(),
      historyFrom: historyFrom.toISOString(),
    },
    coverage: {
      ordersWithCustomerHash: orders.length,
      currentOrdersWithCustomerHash: currentOrders.length,
      note:
        "Repeat-customer reporting only includes confirmed orders recorded after pseudonymous customer hashing was introduced.",
    },
    summary: {
      currentCustomers: activeCurrentCustomers.size,
      firstTimeOrders,
      repeatOrders,
      returningCustomers: returningCurrentCustomers.size,
      observedCustomers: byCustomer.size,
      observedRepeatCustomers: repeatCustomerHashes.size,
      repeatPurchaseRate: pct(repeatCustomerHashes.size, byCustomer.size),
      averageDaysBetweenOrders: average(gaps),
      reorderSessions: reorder.sessions,
      reorderOrderSessions: reorder.orderSessions,
      reorderConversionRate: reorder.conversionRate,
      wishlistSessions: wishlist.sessions,
      wishlistOrderSessions: wishlist.orderSessions,
      wishlistConversionRate: wishlist.conversionRate,
      reviewedCustomers: reviewedCustomers.size,
      reviewRepeatCustomers: reviewRepeatCustomers.size,
      reviewToRepeatRate: pct(
        reviewRepeatCustomers.size,
        reviewedCustomers.size,
      ),
    },
    lifecycle,
    repeatProducts: [...repeatProducts.entries()]
      .map(([productId, row]) => ({
        productId,
        repeatUnits: row.units,
        repeatCustomers: row.customers.size,
        repeatOrderLines: row.orders,
      }))
      .sort(
        (a, b) =>
          b.repeatCustomers - a.repeatCustomers ||
          b.repeatUnits - a.repeatUnits,
      )
      .slice(0, 20),
    combinations: [...combinations.entries()]
      .map(([key, orders]) => {
        const [productA, productB] = key.split("|");
        return { productA, productB, orders };
      })
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 20),
  };
}
