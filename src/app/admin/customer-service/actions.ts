"use server";

import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-auth";
import { updateSupportCase } from "@/lib/support-cases";
import type {
  SupportCaseStatus,
  SupportPriority,
} from "@/lib/support-case-model";

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function updateSupportCaseAction(formData: FormData) {
  const admin = await requireAdminPermission("support.manage");
  const id = text(formData, "id", 80);
  const status = text(formData, "status", 40) as SupportCaseStatus;
  const priority = text(formData, "priority", 20) as SupportPriority;
  const internalNote = text(formData, "internalNote", 1200);

  const statuses = new Set<SupportCaseStatus>([
    "new",
    "reviewing",
    "waiting-customer",
    "waiting-operations",
    "resolved",
    "closed",
  ]);
  const priorities = new Set<SupportPriority>([
    "low",
    "normal",
    "high",
    "urgent",
  ]);

  if (!/^[a-f0-9]{32}$/.test(id) || !statuses.has(status) || !priorities.has(priority)) {
    redirect("/admin/customer-service?error=" + encodeURIComponent("Invalid support-case update."));
  }

  try {
    await updateSupportCase(admin.username, id, {
      status,
      priority,
      ...(internalNote ? { internalNote } : {}),
    });
  } catch (error) {
    redirect(
      "/admin/customer-service?error=" +
        encodeURIComponent(
          error instanceof Error ? error.message : "Unable to update support case.",
        ),
    );
  }

  redirect("/admin/customer-service?saved=1");
}
