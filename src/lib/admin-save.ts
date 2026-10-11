import "server-only";
import { redirect } from "next/navigation";
import { updateDraftStorefrontConfig } from "@/lib/storefront-admin-store";

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
      const requested = String(formData.get("builderWorkspace") || "design");
      const workspace = ["design", "settings", "pages", "campaigns"].includes(requested) ? requested : "design";
      redirect("/admin/builder?workspace=" + workspace + "&error=" + encodeURIComponent(error.message));
    }
    throw error;
  }
}
