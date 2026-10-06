import { expect, test } from "@playwright/test";
import type { PublicProductReview } from "../src/lib/review-types";
import {
  matchesTrackedItem,
  reviewLooksSpam,
  reviewSummary,
  sortPublicReviews,
} from "../src/lib/review-utils";

function review(
  id: string,
  rating: 1 | 2 | 3 | 4 | 5,
  overrides: Partial<PublicProductReview> = {},
): PublicProductReview {
  return {
    id,
    productId: "simple-refreshing",
    reviewerName: "Customer",
    rating,
    title: "Useful review",
    body: "This is a detailed verified customer review.",
    verifiedPurchase: true,
    featured: false,
    helpfulCount: 0,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

test("review summary calculates average and rating distribution", () => {
  const summary = reviewSummary([
    review("a", 5),
    review("b", 4),
    review("c", 1, { featured: true }),
  ]);

  expect(summary.count).toBe(3);
  expect(summary.average).toBe(3.33);
  expect(summary.distribution[5]).toBe(1);
  expect(summary.distribution[4]).toBe(1);
  expect(summary.distribution[1]).toBe(1);
  expect(summary.featuredCount).toBe(1);
});

test("featured reviews stay visible first while helpful sorting still applies", () => {
  const rows = sortPublicReviews(
    [
      review("ordinary", 5, { helpfulCount: 20 }),
      review("featured", 4, { featured: true, helpfulCount: 1 }),
      review("helpful", 3, { helpfulCount: 10 }),
    ],
    "helpful",
  );

  expect(rows.map((row) => row.id)).toEqual([
    "featured",
    "ordinary",
    "helpful",
  ]);
});

test("review spam safeguards reject links and extreme repetition", () => {
  expect(reviewLooksSpam("Great", "Visit https://spam.example for a deal")).toBe(true);
  expect(reviewLooksSpam("Great", "aaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(true);
  expect(reviewLooksSpam("Good cleanser", "Gentle on my skin and easy to rinse after use.")).toBe(false);
});

test("tracked delivered item matching tolerates punctuation but protects product identity", () => {
  expect(
    matchesTrackedItem(
      { name: "Simple Refreshing Facial Wash", brand: "Simple", size: "150 ml" },
      { name: "Simple Refreshing Facial Wash", brand: "Simple", size: "150ml" },
    ),
  ).toBe(true);

  expect(
    matchesTrackedItem(
      { name: "Simple Refreshing Facial Wash", brand: "Simple", size: "150 ml" },
      { name: "Simple Hydrating Light Moisturiser", brand: "Simple", size: "125 ml" },
    ),
  ).toBe(false);
});
