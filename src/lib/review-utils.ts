import type {
  PublicProductReview,
  ReviewSort,
  ReviewSummary,
} from "@/lib/review-types";

export function reviewSummary(
  reviews: Array<Pick<PublicProductReview, "rating" | "featured">>,
): ReviewSummary {
  const distribution: ReviewSummary["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let total = 0;
  let featuredCount = 0;

  for (const review of reviews) {
    distribution[review.rating] += 1;
    total += review.rating;
    if (review.featured) featuredCount += 1;
  }

  return {
    count: reviews.length,
    average: reviews.length
      ? Math.round((total / reviews.length) * 100) / 100
      : 0,
    featuredCount,
    distribution,
  };
}

export function sortPublicReviews(
  reviews: PublicProductReview[],
  sort: ReviewSort,
) {
  return [...reviews].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (sort === "highest" && a.rating !== b.rating) return b.rating - a.rating;
    if (sort === "lowest" && a.rating !== b.rating) return a.rating - b.rating;
    if (sort === "helpful" && a.helpfulCount !== b.helpfulCount) {
      return b.helpfulCount - a.helpfulCount;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function reviewLooksSpam(title: string, body: string) {
  const text = (title + " " + body).trim();
  if (/https?:\/\/|www\.|\.com\b|\.xyz\b/i.test(text)) return true;
  if (/(.)\1{7,}/i.test(text)) return true;
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length >= 12) {
    const counts = new Map<string, number>();
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
    if ([...counts.values()].some((count) => count >= Math.ceil(words.length * 0.55))) {
      return true;
    }
  }
  return false;
}

function comparable(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function comparableMeasure(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function matchesTrackedItem(
  product: { name: string; brand: string; size: string },
  item: { name: string; brand: string; size: string },
) {
  const productName = comparable(product.name);
  const itemName = comparable(item.name);
  const sameName =
    productName === itemName ||
    productName.includes(itemName) ||
    itemName.includes(productName);
  const sameBrand =
    !product.brand ||
    !item.brand ||
    comparable(product.brand) === comparable(item.brand);
  const sameSize =
    !product.size ||
    !item.size ||
    comparableMeasure(product.size) === comparableMeasure(item.size);
  return sameName && sameBrand && sameSize;
}
