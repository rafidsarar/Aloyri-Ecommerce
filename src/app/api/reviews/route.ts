import { getProductById } from "@/lib/catalog";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";
import { rateAllowed, requestIp } from "@/lib/request-rate-limit";
import {
  createVerifiedReview,
  productReviewData,
  recordReviewMetric,
} from "@/lib/review-store";
import type { ReviewSort } from "@/lib/review-types";
import { matchesTrackedItem, reviewLooksSpam } from "@/lib/review-utils";

export const dynamic = "force-dynamic";

function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safeProductId(value: unknown) {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)
    ? value
    : null;
}

function safeOrder(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^WEB-[A-Z0-9-]{8,90}$/i.test(normalized) ? normalized : null;
}

function safeText(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= min && normalized.length <= max
    ? normalized
    : null;
}

async function resolveProduct(productId: string) {
  try {
    const catalog = await fetchCrmCatalog();
    if (catalog.ok) {
      const product = catalog.body.products.find((item) => item.id === productId);
      if (product) return product;
    }
  } catch {
    // Eligibility can fall back to website-owned catalog identity.
  }
  return getProductById(productId) || null;
}

async function verifyDeliveredPurchase(input: {
  productId: string;
  orderNumber: string;
  phone: string;
}) {
  const [tracking, product] = await Promise.all([
    fetchCrmOrderTracking({
      orderNumber: input.orderNumber,
      phone: normalizeBangladeshPhone(input.phone),
    }),
    resolveProduct(input.productId),
  ]);

  if (!tracking.ok) {
    return {
      ok: false as const,
      status: tracking.status === 404 ? 404 : 503,
      error:
        tracking.status === 404
          ? "Check the order number and mobile number and try again."
          : "Review verification is temporarily unavailable.",
    };
  }
  if (!product) {
    return {
      ok: false as const,
      status: 404,
      error: "This product is not available for review.",
    };
  }
  if (
    (tracking.body.status !== "Delivered" &&
      tracking.body.status !== "Returned") ||
    !tracking.body.deliveredDate
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "Reviews open after this order has been delivered.",
    };
  }

  const purchased = tracking.body.items.some((item) =>
    matchesTrackedItem(product, item),
  );
  if (!purchased) {
    return {
      ok: false as const,
      status: 403,
      error: "This product was not found in that delivered order.",
    };
  }

  return { ok: true as const, product };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = safeProductId(url.searchParams.get("productId"));
  if (!productId) return response({ error: "Invalid product." }, 400);
  const sortRaw = url.searchParams.get("sort");
  const sort: ReviewSort =
    sortRaw === "highest" ||
    sortRaw === "lowest" ||
    sortRaw === "helpful"
      ? sortRaw
      : "newest";
  const ratingRaw = Number(url.searchParams.get("rating"));
  const rating =
    Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
      ? ratingRaw
      : undefined;
  return response(await productReviewData(productId, { sort, rating }));
}

export async function POST(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return response({ error: "Content-Type must be application/json." }, 415);
  }
  const ip = requestIp(request);
  if (!rateAllowed("reviews", ip, 12, 60 * 60_000)) {
    return response(
      { error: "Too many review attempts. Please try again later." },
      429,
    );
  }

  const raw = await request.text();
  if (raw.length > 12_000) return response({ error: "Review is too large." }, 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return response({ error: "Invalid review request." }, 400);
  }

  const action = body.action === "submit" ? "submit" : "eligibility";
  const productId = safeProductId(body.productId);
  const orderNumber = safeOrder(body.orderNumber);
  const phone =
    typeof body.phone === "string" && isValidBangladeshPhone(body.phone)
      ? body.phone
      : null;
  if (!productId || !orderNumber || !phone) {
    return response(
      { error: "Check the product, order number and mobile number." },
      400,
    );
  }

  const verified = await verifyDeliveredPurchase({
    productId,
    orderNumber,
    phone,
  });
  if (!verified.ok) return response({ error: verified.error }, verified.status);

  if (action === "eligibility") {
    await recordReviewMetric("eligibleChecks");
    return response({
      eligible: true,
      productName: verified.product.name,
      message: "Delivered purchase verified.",
    });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return response({ error: "Unable to submit this review." }, 400);
  }
  const reviewerName = safeText(body.reviewerName, 2, 60);
  const title = safeText(body.title, 2, 100);
  const reviewBody = safeText(body.body, 20, 1800);
  const rating =
    typeof body.rating === "number" &&
    Number.isInteger(body.rating) &&
    body.rating >= 1 &&
    body.rating <= 5
      ? (body.rating as 1 | 2 | 3 | 4 | 5)
      : null;

  if (!reviewerName || !title || !reviewBody || !rating) {
    return response(
      { error: "Add your name, rating, title and review details." },
      400,
    );
  }
  if (reviewLooksSpam(title, reviewBody)) {
    return response(
      { error: "Please remove links or repetitive promotional text." },
      400,
    );
  }

  try {
    const review = await createVerifiedReview({
      productId,
      reviewerName,
      rating,
      title,
      body: reviewBody,
      orderNumber,
    });
    await recordReviewMetric("submissions");
    return response(
      {
        submitted: true,
        reviewId: review.id,
        status: review.status,
        message: "Thank you. Your verified review is awaiting moderation.",
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit review.";
    return response(
      { error: message },
      /already reviewed/i.test(message) ? 409 : 503,
    );
  }
}
