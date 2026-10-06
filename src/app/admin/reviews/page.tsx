import Link from "next/link";
import { moderateReviewAction } from "@/app/admin/reviews/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { listProductReviews } from "@/lib/review-store";
import type { ReviewStatus } from "@/lib/review-types";

const filters = ["all", "pending", "approved", "flagged", "hidden"] as const;

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const admin = await requireAdminPermission("products.view");
  const query = await searchParams;
  const selected = filters.includes(query.status as (typeof filters)[number])
    ? (query.status as (typeof filters)[number])
    : "pending";
  const [reviews, catalog] = await Promise.all([
    listProductReviews(),
    fetchCrmCatalog(),
  ]);
  const names = new Map(
    catalog.ok
      ? catalog.body.products.map(
          (product) => [product.id, product.brand + " · " + product.name] as const,
        )
      : [],
  );
  const counts = {
    pending: reviews.filter((review) => review.status === "pending").length,
    approved: reviews.filter((review) => review.status === "approved").length,
    flagged: reviews.filter((review) => review.status === "flagged").length,
    hidden: reviews.filter((review) => review.status === "hidden").length,
  };
  const rows =
    selected === "all"
      ? reviews
      : reviews.filter((review) => review.status === selected);

  return (
    <AdminShell
      username={admin.username}
      title="Reviews & product trust"
      subtitle="Moderate verified-purchase product reviews without moving customer, order, inventory or finance ownership out of CRM."
    >
      {query.saved ? <AdminNotice>Review moderation saved.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}
      {!catalog.ok ? (
        <AdminNotice tone="warning">
          CRM catalog names are unavailable. Review records remain safe and are shown by product ID.
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pending", counts.pending],
          ["Approved", counts.approved],
          ["Flagged", counts.flagged],
          ["Hidden", counts.hidden],
        ].map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </AdminCard>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              key={filter}
              href={"/admin/reviews?status=" + filter}
              className={
                filter === selected
                  ? "rounded-full bg-[#713a35] px-4 py-2 text-xs font-semibold text-white"
                  : "rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-black/55"
              }
            >
              {filter[0].toUpperCase() + filter.slice(1)}
            </Link>
          ))}
        </div>
        <Link
          href="/admin/analytics/reviews"
          className="text-xs font-semibold text-[#713a35]"
        >
          Review analytics →
        </Link>
      </div>

      <AdminNotice tone="neutral">
        Moderation is for spam, relevance, safety and policy compliance—not for whether a customer rating is positive or negative. Photo-review fields are reserved in the data model, but public photo uploads stay disabled until media moderation controls are added.
      </AdminNotice>

      <div className="mt-5 grid gap-4">
        {rows.map((review) => (
          <AdminCard key={review.id}>
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#f2e8e4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#713a35]">
                    {review.rating} / 5
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-700">
                    Verified purchase
                  </span>
                  <span className="rounded-full border border-black/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-black/45">
                    {review.status}
                  </span>
                  {review.featured ? (
                    <span className="rounded-full bg-[#713a35] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-white">
                      Featured
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-4 text-lg font-semibold">{review.title}</h2>
                <p className="mt-2 text-sm leading-7 text-black/58">{review.body}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-black/42">
                  <span>{review.reviewerName}</span>
                  <span>{names.get(review.productId) || review.productId}</span>
                  <span>{new Date(review.createdAt).toLocaleDateString("en-BD")}</span>
                  <span>{review.helpfulCount} helpful votes</span>
                </div>
                {review.moderationNote ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Moderation note: {review.moderationNote}
                  </p>
                ) : null}
              </div>

              <form action={moderateReviewAction} className="grid gap-3 rounded-xl bg-[#f7f4f2] p-4">
                <input type="hidden" name="id" value={review.id} />
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    name="featured"
                    defaultChecked={review.featured}
                  />
                  Feature this review when approved
                </label>
                <textarea
                  name="moderationNote"
                  defaultValue={review.moderationNote || ""}
                  maxLength={500}
                  rows={3}
                  placeholder="Internal moderation note (optional)"
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    name="status"
                    value="approved"
                    className="rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    name="status"
                    value="hidden"
                    className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs font-semibold"
                  >
                    Hide
                  </button>
                  <button
                    name="status"
                    value="flagged"
                    className="rounded-lg bg-amber-100 px-3 py-2.5 text-xs font-semibold text-amber-900"
                  >
                    Flag
                  </button>
                  <button
                    name="status"
                    value="pending"
                    className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs font-semibold"
                  >
                    Pending
                  </button>
                </div>
              </form>
            </div>
          </AdminCard>
        ))}
        {!rows.length ? (
          <AdminCard>
            <p className="py-8 text-center text-sm text-black/45">
              No reviews match this moderation filter.
            </p>
          </AdminCard>
        ) : null}
      </div>
    </AdminShell>
  );
}
