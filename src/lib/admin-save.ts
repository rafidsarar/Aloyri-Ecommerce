import "server-only";
import { redirect } from "next/navigation";
import { updateDraftStorefrontConfig } from "@/lib/storefront-admin-store";
import { ownerSaveConflictDestination } from "@/lib/admin-save-destination";

export async function saveAdminStorefront(
  formData: FormData,
  updater: Parameters<typeof updateDraftStorefrontConfig>[0],
  audit: Parameters<typeof updateDraftStorefrontConfig>[1],
) {
  try {
    return await updateDraftStorefrontConfig(updater, {
      ...audit,
      actor: audit?.actor || "owner",
      action: audit?.action || "storefront.updated",
      expectedUpdatedAt: String(formData.get("storefrontVersion") || "") || undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("This page has changed")) {
      const destination = ownerSaveConflictDestination({
        scope: audit?.scope,
        action: audit?.action,
        target: audit?.target,
      });
      redirect(destination + "?error=" + encodeURIComponent(error.message));
    }
    throw error;
  }
}
