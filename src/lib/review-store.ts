import "server-only";

import {
  blobConfigured,
  listPrivateJsonRecords,
  readPrivateJson,
  writePrivateJson,
} from "@/lib/storefront-admin-store";
import type {
  ProductReview,
  PublicProductReview,
  PublicReviewData,
  ReviewMetricDay,
  ReviewSort,
  ReviewStatus,
} from "@/lib/review-types";
import { reviewSummary, sortPublicReviews } from "@/lib/review-utils";

const ITEM_PREFIX = "reviews/items/";
const ORDER_PREFIX = "reviews/orders/";
const HELPFUL_PREFIX = "reviews/helpful/";
const METRIC_PREFIX = "reviews/metrics/";
const MAX_REVIEWS = 3000;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function safeId(value: string) {
  return /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

export async function listProductReviews(limit = MAX_REVIEWS) {
  if (!blobConfigured()) return [] as ProductReview[];
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_REVIEWS);
  const rows = await listPrivateJsonRecords<ProductReview>(
    ITEM_PREFIX,
    safeLimit,
  );
  return rows
    .map((row) => row.value)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReview(id: string) {
  if (!safeId(id)) return null;
  return readPrivateJson<ProductReview>(ITEM_PREFIX + id + ".json");
}

export async function productReviewData(
  productId: string,
  options: { sort?: ReviewSort; rating?: number; limit?: number } = {},
): Promise<PublicReviewData> {
  const approved = (await listProductReviews()).filter(
    (review) => review.productId === productId && review.status === "approved",
  );
  const publicRows: PublicProductReview[] = approved.map((review) => ({
    id: review.id,
    productId: review.productId,
    reviewerName: review.reviewerName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    verifiedPurchase: true,
    featured: review.featured,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt,
  }));
  const filtered =
    options.rating && options.rating >= 1 && options.rating <= 5
      ? publicRows.filter((review) => review.rating === options.rating)
      : publicRows;
  return {
    summary: reviewSummary(publicRows),
    reviews: sortPublicReviews(filtered, options.sort || "newest").slice(
      0,
      Math.min(Math.max(options.limit || 60, 1), 100),
    ),
  };
}

export async function createVerifiedReview(input: {
  productId: string;
  reviewerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  orderNumber: string;
  customerHash?: string;
}) {
  const orderHash = await sha256(
    "aloyri-review-order-v1:" + input.orderNumber.trim().toUpperCase(),
  );
  const markerPath =
    ORDER_PREFIX + orderHash + "-" + input.productId + ".json";
  const existing = await readPrivateJson<{ reviewId: string }>(markerPath);
  if (existing?.reviewId) {
    throw new Error("This delivered order has already reviewed this product.");
  }

  const now = new Date().toISOString();
  const review: ProductReview = {
    version: 1,
    id: crypto.randomUUID().replace(/-/g, ""),
    productId: input.productId,
    reviewerName: input.reviewerName,
    rating: input.rating,
    title: input.title,
    body: input.body,
    verifiedPurchase: true,
    orderHash,
    ...(input.customerHash ? { customerHash: input.customerHash } : {}),
    status: "pending",
    featured: false,
    helpfulCount: 0,
    media: [],
    createdAt: now,
    updatedAt: now,
  };

  await writePrivateJson(ITEM_PREFIX + review.id + ".json", review);
  await writePrivateJson(markerPath, {
    version: 1,
    reviewId: review.id,
    createdAt: now,
  });
  return review;
}

export async function moderateReview(
  id: string,
  input: {
    status: ReviewStatus;
    featured: boolean;
    moderationNote?: string;
  },
) {
  const review = await getReview(id);
  if (!review) throw new Error("Review not found.");
  const now = new Date().toISOString();
  const updated: ProductReview = {
    ...review,
    status: input.status,
    featured: input.status === "approved" ? input.featured : false,
    ...(input.status === "approved"
      ? { approvedAt: review.approvedAt || now }
      : {}),
    ...(input.moderationNote
      ? { moderationNote: input.moderationNote.slice(0, 500) }
      : {}),
    updatedAt: now,
  };
  await writePrivateJson(ITEM_PREFIX + id + ".json", updated);
  return updated;
}

export async function markReviewHelpful(id: string, clientId: string) {
  if (!safeId(id) || !/^[A-Za-z0-9_-]{16,80}$/.test(clientId)) {
    throw new Error("Invalid helpful vote.");
  }
  const review = await getReview(id);
  if (!review || review.status !== "approved") {
    throw new Error("Review not found.");
  }

  const clientHash = await sha256("aloyri-review-helpful-v1:" + clientId);
  const marker = HELPFUL_PREFIX + id + "/" + clientHash + ".json";
  const existing = await readPrivateJson<{ createdAt: string }>(marker);
  if (existing) {
    return { helpfulCount: review.helpfulCount, recorded: false };
  }

  await writePrivateJson(marker, {
    version: 1,
    createdAt: new Date().toISOString(),
  });
  const updated: ProductReview = {
    ...review,
    helpfulCount: review.helpfulCount + 1,
    updatedAt: new Date().toISOString(),
  };
  await writePrivateJson(ITEM_PREFIX + id + ".json", updated);
  return { helpfulCount: updated.helpfulCount, recorded: true };
}

export async function recordReviewMetric(
  metric: "eligibleChecks" | "submissions" | "helpfulVotes",
) {
  const date = new Date().toISOString().slice(0, 10);
  const path = METRIC_PREFIX + date + ".json";
  const current =
    (await readPrivateJson<ReviewMetricDay>(path)) || {
      version: 1 as const,
      date,
      eligibleChecks: 0,
      submissions: 0,
      helpfulVotes: 0,
    };
  const next = { ...current, [metric]: current[metric] + 1 };
  await writePrivateJson(path, next);
  return next;
}

export async function readReviewMetrics(days = 30) {
  if (!blobConfigured()) return [] as ReviewMetricDay[];
  const rows = await listPrivateJsonRecords<ReviewMetricDay>(
    METRIC_PREFIX,
    400,
  );
  const from = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
  return rows
    .map((row) => row.value)
    .filter((row) => {
      const time = Date.parse(row.date + "T00:00:00.000Z");
      return Number.isFinite(time) && time >= from;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
