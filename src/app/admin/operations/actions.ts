"use server";

import { redirect } from "next/navigation";
import {
  createAdminBackup,
  restoreBackupToDraft,
  runOperationalHealth,
  reconcileCrmIntegration,
} from "@/lib/admin-operations";
import { requireAdminPermission } from "@/lib/admin-auth";

function text(formData: FormData, key: string, max = 4000) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function runHealthCheckAction() {
  const admin = await requireAdminPermission("health.run");
  try {
    await runOperationalHealth(admin.username, true);
  } catch (error) {
    redirect(
      "/admin/operations?error=" + encodeURIComponent(errorMessage(error)),
    );
  }
  redirect("/admin/operations?healthRun=1");
}

export async function reconcileCrmAction() {
  const admin = await requireAdminPermission("health.run");
  try {
    await reconcileCrmIntegration(admin.username);
  } catch (error) {
    redirect("/admin/operations?error=" + encodeURIComponent(errorMessage(error)));
  }
  redirect("/admin/operations?crmReconciled=1");
}

export async function createBackupAction(formData: FormData) {
  const admin = await requireAdminPermission("backups.create");
  try {
    await createAdminBackup(admin.username, text(formData, "note", 300));
  } catch (error) {
    redirect(
      "/admin/operations?error=" + encodeURIComponent(errorMessage(error)),
    );
  }
  redirect("/admin/operations?backupCreated=1");
}

export async function restoreBackupAction(formData: FormData) {
  const admin = await requireAdminPermission("backups.restore");
  if (admin.role !== "owner") redirect("/admin?forbidden=1");
  const backupId = text(formData, "backupId", 80);
  const confirm = text(formData, "confirm", 160);
  if (confirm !== "RESTORE " + backupId) {
    redirect(
      "/admin/operations?error=" +
        encodeURIComponent("Type RESTORE " + backupId + " to confirm."),
    );
  }
  try {
    await restoreBackupToDraft(admin.username, backupId);
  } catch (error) {
    redirect(
      "/admin/operations?error=" + encodeURIComponent(errorMessage(error)),
    );
  }
  redirect("/admin/operations?backupRestored=1");
}
