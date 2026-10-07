"use client";

import { volatileStorage } from "@/lib/volatile-storage";

import { useEffect, useState } from "react";
import type {
  PublicReviewData,
  PublicProductReview,
  ReviewSort,
} from "@/lib/review-types";

const REVIEW_CLIENT_KEY = "aloyri_review_client";

function stars(value: number) {
  return "★★★★★".slice(0, Math.round(value)) + "☆☆☆☆☆".slice(Math.round(value));
}

function reviewClientId() {
  try {
    let id = volatileStorage.getItem(REVIEW_CLIENT_KEY) || "";
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) {
      id = crypto.randomUUID().replace(/-/g, "");
      volatileStorage.setItem(REVIEW_CLIENT_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

export function ProductRatingSummary({
  data,
}: {
  data: PublicReviewData;
}) {
  if (!data.summary.count) {
    return (
      <a href="#reviews" className="mt-4 inline-flex text-xs font-semibold text-[#713a35]">
        Be the first verified customer to review this product
      </a>
    );
  }

  return (
    <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm">
      <span className="tracking-[.08em] text-[#9a5a49]" aria-hidden="true">
        {stars(data.summary.average)}
      </span>
      <span className="font-semibold">{data.summary.average.toFixed(1)}</span>
      <span className="text-[#321f1c]/42">
        ({data.summary.count} verified {data.summary.count === 1 ? "review" : "reviews"})
      </span>
    </a>
  );
}

function ReviewCard({
  review,
  onHelpful,
}: {
  review: PublicProductReview;
  onHelpful: (review: PublicProductReview) => void;
}) {
  return (
    <article className="rounded-[1.2rem] border border-[#713a35]/10 bg-white/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="tracking-[.08em] text-[#9a5a49]" aria-label={review.rating + " out of 5 stars"}>
              {stars(review.rating)}
            </span>
            {review.featured ? (
              <span className="rounded-full bg-[#f5e8e2] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-[#713a35]">
                Featured
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold">{review.title}</h3>
        </div>
        <time className="text-[10px] text-[#321f1c]/38" dateTime={review.createdAt}>
          {new Intl.DateTimeFormat("en-BD", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }).format(new Date(review.createdAt))}
        </time>
      </div>
      <p className="mt-3 text-sm leading-7 text-[#321f1c]/58">{review.body}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#713a35]/8 pt-4">
        <div>
          <p className="text-xs font-semibold">{review.reviewerName}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-700">
            ✓ Verified purchase
          </p>
        </div>
        <button
          type="button"
          onClick={() => onHelpful(review)}
          className="rounded-full border border-[#713a35]/12 px-3 py-2 text-xs font-semibold text-[#713a35]"
        >
          Helpful{review.helpfulCount ? " · " + review.helpfulCount : ""}
        </button>
      </div>
    </article>
  );
}

export function ProductReviews({
  productId,
  productName,
  initialData,
}: {
  productId: string;
  productName: string;
  initialData: PublicReviewData;
}) {
  const [data, setData] = useState(initialData);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [eligibility, setEligibility] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ productId, sort });
    if (ratingFilter) query.set("rating", String(ratingFilter));
    void fetch("/api/reviews?" + query.toString(), {
      cache: "no-store",
      credentials: "omit",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((next: PublicReviewData | null) => {
        if (active && next) setData(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [productId, ratingFilter, sort]);

  async function checkEligibility(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          action: "eligibility",
          productId,
          orderNumber,
          phone,
        }),
      });
      const body = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setEligibility(false);
        setError(body.error || "Unable to verify this purchase.");
        return;
      }
      setEligibility(true);
      setNotice(body.message || "Delivered purchase verified.");
    } catch {
      setError("Review verification is temporarily unavailable.");
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          action: "submit",
          productId,
          orderNumber,
          phone,
          reviewerName: form.get("reviewerName"),
          rating: Number(form.get("rating")),
          title: form.get("title"),
          body: form.get("body"),
          website: form.get("website"),
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error || "Unable to submit review.");
        return;
      }
      setSubmitted(true);
      setEligibility(false);
      setNotice(
        result.message ||
          "Thank you. Your verified review is awaiting moderation.",
      );
    } catch {
      setError("Review submission is temporarily unavailable.");
    }
  }

  async function helpful(review: PublicProductReview) {
    try {
      const response = await fetch(
        "/api/reviews/" + encodeURIComponent(review.id) + "/helpful",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({ clientId: reviewClientId() }),
        },
      );
      if (!response.ok) return;
      const result = (await response.json()) as { helpfulCount?: number };
      if (typeof result.helpfulCount !== "number") return;
      setData((current) => ({
        ...current,
        reviews: current.reviews.map((row) =>
          row.id === review.id
            ? { ...row, helpfulCount: result.helpfulCount || 0 }
            : row,
        ),
      }));
    } catch {
      // Helpful voting should never interrupt review reading.
    }
  }

  const total = data.summary.count || 1;

  return (
    <section id="reviews" className="mt-20 border-t border-[#713a35]/10 pt-12 md:mt-24">
      <div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            Verified customer reviews
          </p>
          <h2 className="display mt-2 text-4xl">What customers say.</h2>
          <div className="mt-6 rounded-[1.3rem] bg-[#f5e8e2] p-5">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-semibold">
                {data.summary.count ? data.summary.average.toFixed(1) : "—"}
              </span>
              <span className="pb-1 text-sm text-[#321f1c]/45">out of 5</span>
            </div>
            <p className="mt-2 tracking-[.1em] text-[#9a5a49]" aria-hidden="true">
              {data.summary.count ? stars(data.summary.average) : "☆☆☆☆☆"}
            </p>
            <p className="mt-2 text-xs text-[#321f1c]/45">
              {data.summary.count} approved verified-purchase reviews
            </p>

            <div className="mt-5 grid gap-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = data.summary.distribution[rating as 1 | 2 | 3 | 4 | 5];
                const width = Math.round((count / total) * 100);
                return (
                  <button
                    type="button"
                    key={rating}
                    onClick={() =>
                      setRatingFilter((current) => (current === rating ? 0 : rating))
                    }
                    className="grid grid-cols-[42px_1fr_28px] items-center gap-2 text-left text-xs"
                    aria-pressed={ratingFilter === rating}
                  >
                    <span>{rating} ★</span>
                    <span className="h-2 overflow-hidden rounded-full bg-white/70">
                      <span
                        className="block h-full rounded-full bg-[#b9725f]"
                        style={{ width: width + "%" }}
                      />
                    </span>
                    <span className="text-right text-[#321f1c]/45">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-[1.3rem] border border-[#713a35]/10 bg-white/65 p-5">
            <p className="text-sm font-semibold">Bought {productName} from Aloyri?</p>
            <p className="mt-2 text-xs leading-6 text-[#321f1c]/48">
              Reviews are available after delivery. We verify your website order number and checkout mobile number against CRM, but neither is stored with your review.
            </p>

            {!eligibility ? (
              <form onSubmit={checkEligibility} className="mt-4 grid gap-3">
                <input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="Order number (WEB-...)"
                  autoComplete="off"
                  className="rounded-xl border border-[#713a35]/12 bg-white px-4 py-3 text-sm"
                  required
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Checkout mobile number"
                  inputMode="tel"
                  autoComplete="tel"
                  className="rounded-xl border border-[#713a35]/12 bg-white px-4 py-3 text-sm"
                  required
                />
                <button className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
                  Verify delivered purchase
                </button>
              </form>
            ) : (
              <form onSubmit={submitReview} className="mt-4 grid gap-3">
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />
                <label className="grid gap-1 text-xs font-medium">
                  Display name
                  <input
                    name="reviewerName"
                    maxLength={60}
                    className="rounded-xl border border-[#713a35]/12 bg-white px-4 py-3 text-sm"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Rating
                  <select
                    name="rating"
                    defaultValue="5"
                    className="rounded-xl border border-[#713a35]/12 bg-white px-4 py-3 text-sm"
                  >
                    <option value="5">5 — Excellent</option>
                    <option value="4">4 — Very good</option>
                    <option value="3">3 — Good</option>
                    <option value="2">2 — Fair</option>
                    <option value="1">1 — Poor</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Review title
                  <input
                    name="title"
                    maxLength={100}
                    className="rounded-xl border border-[#713a35]/12 bg-white px-4 py-3 text-sm"
                    required
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  Your experience
                  <textarea
                    name="body"
                    minLength={20}
                    maxLength={1800}
                    rows={5}
                    className="rounded-xl border border-[#713a35]/12 bg-white px-4 py-3 text-sm leading-6"
                    required
                  />
                </label>
                <button className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
                  Submit verified review
                </button>
              </form>
            )}

            {notice ? (
              <p className="mt-3 text-xs leading-5 text-emerald-700" aria-live="polite">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 text-xs leading-5 text-[#8a3129]" role="alert">
                {error}
              </p>
            ) : null}
            {submitted ? (
              <p className="mt-2 text-[10px] leading-5 text-[#321f1c]/40">
                Reviews are moderated for spam, relevance and safety—not for whether the rating is positive or negative.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#321f1c]/48">
              {ratingFilter ? ratingFilter + "-star reviews" : "All approved reviews"}
            </p>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ReviewSort)}
              className="rounded-full border border-[#713a35]/12 bg-white px-4 py-2 text-xs font-semibold text-[#713a35]"
            >
              <option value="newest">Newest</option>
              <option value="helpful">Most helpful</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>

          <div className="grid gap-4">
            {data.reviews.length ? (
              data.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} onHelpful={helpful} />
              ))
            ) : (
              <div className="rounded-[1.3rem] border border-dashed border-[#713a35]/15 p-8 text-center">
                <p className="text-sm font-semibold">
                  {ratingFilter
                    ? "No approved reviews at this rating yet."
                    : "No approved reviews yet."}
                </p>
                <p className="mt-2 text-xs leading-6 text-[#321f1c]/45">
                  Verified delivered customers can submit the first review.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
