"use server";

import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-auth";
import { moderateReview } from "@/lib/review-store";
import { writeAdminAuditEvent } from "@/lib/storefront-admin-store";
import type { ReviewStatus } from "@/lib/review-types";

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function moderateReviewAction(formData: FormData) {
  const admin = await requireAdminPermission("products.edit");
  const id = text(formData, "id", 80);
  const statusRaw = text(formData, "status", 20);
  const allowed = new Set<ReviewStatus>([
    "approved",
    "hidden",
    "flagged",
    "pending",
  ]);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id) || !allowed.has(statusRaw as ReviewStatus)) {
    redirect("/admin/reviews?error=" + encodeURIComponent("Invalid review action."));
  }

  const status = statusRaw as ReviewStatus;
  const featured = formData.get("featured") === "on";
  const note = text(formData, "moderationNote", 500);

  try {
    const review = await moderateReview(id, {
      status,
      featured,
      ...(note ? { moderationNote: note } : {}),
    });
    await writeAdminAuditEvent(
      admin.username,
      "reviews.moderated",
      `Review ${id} set to ${status}${review.featured ? " and featured" : ""}.`,
      {
        scope: "reviews",
        target: id,
        changes: [
          { path: "status", after: status },
          { path: "featured", after: String(review.featured) },
        ],
      },
    );
  } catch (error) {
    redirect(
      "/admin/reviews?error=" +
        encodeURIComponent(
          error instanceof Error ? error.message : "Unable to moderate review.",
        ),
    );
  }

  redirect("/admin/reviews?saved=1");
}
