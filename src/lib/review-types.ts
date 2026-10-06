export type ReviewStatus = "pending" | "approved" | "hidden" | "flagged";
export type ReviewSort = "newest" | "highest" | "lowest" | "helpful";

export type ProductReview = {
  version: 1;
  id: string;
  productId: string;
  reviewerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  verifiedPurchase: true;
  orderHash: string;
  status: ReviewStatus;
  featured: boolean;
  helpfulCount: number;
  media: [];
  createdAt: string;
  updatedAt: string;
  moderationNote?: string;
};

export type PublicProductReview = Pick<
  ProductReview,
  | "id"
  | "productId"
  | "reviewerName"
  | "rating"
  | "title"
  | "body"
  | "verifiedPurchase"
  | "featured"
  | "helpfulCount"
  | "createdAt"
>;

export type ReviewSummary = {
  count: number;
  average: number;
  featuredCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type PublicReviewData = {
  summary: ReviewSummary;
  reviews: PublicProductReview[];
};

export type ReviewMetricDay = {
  version: 1;
  date: string;
  eligibleChecks: number;
  submissions: number;
  helpfulVotes: number;
};
