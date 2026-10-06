import "server-only";

import { readAnalyticsEvents } from "@/lib/analytics-store";
import {
  listProductReviews,
  readReviewMetrics,
} from "@/lib/review-store";

function pct(numerator: number, denominator: number) {
  return denominator
    ? Math.round((numerator / denominator) * 10_000) / 100
    : 0;
}

function average(values: number[]) {
  return values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
    : 0;
}

function productConversion(
  events: Awaited<ReturnType<typeof readAnalyticsEvents>>,
  productId: string,
  from: number,
  to: number,
) {
  const inWindow = events.filter((event) => {
    const time = Date.parse(event.timestamp);
    return time >= from && time < to;
  });
  const views = inWindow.filter(
    (event) => event.event === "product_view" && event.productId === productId,
  ).length;
  const orders = inWindow.filter(
    (event) =>
      event.event === "order_created" &&
      event.confirmed &&
      event.items?.some((item) => item.productId === productId),
  ).length;
  return { views, orders, conversionRate: pct(orders, views) };
}

export async function buildReviewAnalytics(days = 30) {
  const normalizedDays = [7, 30, 90].includes(days) ? days : 30;
  const now = new Date();
  const currentFrom = new Date(
    now.getTime() - normalizedDays * 24 * 60 * 60 * 1000,
  );
  const previousFrom = new Date(
    currentFrom.getTime() - normalizedDays * 24 * 60 * 60 * 1000,
  );

  const [reviews, metrics, analytics] = await Promise.all([
    listProductReviews(),
    readReviewMetrics(normalizedDays),
    readAnalyticsEvents(
      new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
      now,
    ),
  ]);

  const currentReviews = reviews.filter(
    (review) => Date.parse(review.createdAt) >= currentFrom.getTime(),
  );
  const previousReviews = reviews.filter((review) => {
    const time = Date.parse(review.createdAt);
    return time >= previousFrom.getTime() && time < currentFrom.getTime();
  });

  const metricTotals = metrics.reduce(
    (sum, row) => ({
      eligibleChecks: sum.eligibleChecks + row.eligibleChecks,
      submissions: sum.submissions + row.submissions,
      helpfulVotes: sum.helpfulVotes + row.helpfulVotes,
    }),
    { eligibleChecks: 0, submissions: 0, helpfulVotes: 0 },
  );

  const approved = reviews.filter((review) => review.status === "approved");
  const groups = new Map<string, typeof approved>();
  for (const review of approved) {
    const rows = groups.get(review.productId) || [];
    rows.push(review);
    groups.set(review.productId, rows);
  }

  const products = [...groups.entries()]
    .map(([productId, rows]) => {
      const sorted = [...rows].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
      const firstApprovedAt = Date.parse(sorted[0].updatedAt || sorted[0].createdAt);
      const windowMs = 30 * 24 * 60 * 60 * 1000;
      const before = productConversion(
        analytics,
        productId,
        firstApprovedAt - windowMs,
        firstApprovedAt,
      );
      const after = productConversion(
        analytics,
        productId,
        firstApprovedAt,
        Math.min(now.getTime(), firstApprovedAt + windowMs),
      );
      return {
        productId,
        approvedReviews: rows.length,
        averageRating: average(rows.map((review) => review.rating)),
        lowRatings: rows.filter((review) => review.rating <= 2).length,
        featuredReviews: rows.filter((review) => review.featured).length,
        firstApprovedAt: new Date(firstApprovedAt).toISOString(),
        latestReviewAt: [...rows]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt,
        before,
        after,
        conversionDelta:
          Math.round((after.conversionRate - before.conversionRate) * 100) / 100,
      };
    })
    .sort((a, b) => b.approvedReviews - a.approvedReviews);

  const currentApproved = currentReviews.filter(
    (review) => review.status === "approved",
  );
  const previousApproved = previousReviews.filter(
    (review) => review.status === "approved",
  );
  const currentAverage = average(currentApproved.map((review) => review.rating));
  const previousAverage = average(previousApproved.map((review) => review.rating));

  return {
    range: { days: normalizedDays, from: currentFrom.toISOString(), to: now.toISOString() },
    totals: {
      all: reviews.length,
      approved: approved.length,
      pending: reviews.filter((review) => review.status === "pending").length,
      hidden: reviews.filter((review) => review.status === "hidden").length,
      flagged: reviews.filter((review) => review.status === "flagged").length,
      eligibleChecks: metricTotals.eligibleChecks,
      submissions: metricTotals.submissions,
      helpfulVotes: metricTotals.helpfulVotes,
      submissionRate: pct(metricTotals.submissions, metricTotals.eligibleChecks),
      currentAverage,
      previousAverage,
      averageDelta:
        Math.round((currentAverage - previousAverage) * 100) / 100,
    },
    products,
  };
}
