"use server";

import { redirect } from "next/navigation";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  ROLE_TEMPLATES,
  createStaffAccount,
  deleteStaffAccount,
  getAdminAccount,
  requireAdminPermission,
  resetStaffPassword,
  setStaffActive,
  updateStaffAccess,
  type AdminRole,
} from "@/lib/admin-auth";

function text(formData: FormData, key: string, max = 4000) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function permissions(formData: FormData) {
  return ADMIN_PERMISSIONS.filter(
    (permission) => formData.get("permission_" + permission) === "on",
  );
}

function role(value: string): Exclude<AdminRole, "owner"> {
  if (
    (ADMIN_ROLES as readonly string[]).includes(value) &&
    value !== "owner"
  ) {
    return value as Exclude<AdminRole, "owner">;
  }
  return "content-editor";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createStaffAction(formData: FormData) {
  const admin = await requireAdminPermission("staff.manage");
  const selectedRole = role(text(formData, "role", 40));
  const selectedPermissions = permissions(formData);
  let accountId: string;
  try {
    const account = await createStaffAccount(admin, {
      username: text(formData, "username", 48),
      displayName: text(formData, "displayName", 80),
      role: selectedRole,
      permissions: selectedPermissions.length
        ? selectedPermissions
        : ROLE_TEMPLATES[selectedRole],
      temporaryPassword: text(formData, "temporaryPassword", 128),
    });
    accountId = account.id;
  } catch (error) {
    redirect(
      "/admin/staff/new?error=" + encodeURIComponent(errorMessage(error)),
    );
  }
  redirect("/admin/staff/" + accountId + "?created=1");
}

export async function updateStaffAction(formData: FormData) {
  const admin = await requireAdminPermission("staff.manage");
  const accountId = text(formData, "accountId", 80);
  const existing = await getAdminAccount(accountId);
  if (!existing) redirect("/admin/staff?error=Staff+account+not+found");

  try {
    await updateStaffAccess(admin, {
      accountId,
      displayName: text(formData, "displayName", 80),
      role:
        existing.role === "owner"
          ? "owner"
          : role(text(formData, "role", 40)),
      permissions:
        existing.role === "owner"
          ? [...ADMIN_PERMISSIONS]
          : permissions(formData),
    });
  } catch (error) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/staff/" + encodeURIComponent(accountId) + "?saved=1");
}

export async function suspendStaffAction(formData: FormData) {
  const admin = await requireAdminPermission("staff.manage");
  const accountId = text(formData, "accountId", 80);
  const account = await getAdminAccount(accountId);
  if (!account) redirect("/admin/staff?error=Staff+account+not+found");
  const confirm = text(formData, "confirm", 120);
  if (confirm !== "SUSPEND " + account.username) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent("Type SUSPEND " + account.username + " to confirm."),
    );
  }

  try {
    await setStaffActive(admin, accountId, false);
  } catch (error) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }
  redirect("/admin/staff/" + encodeURIComponent(accountId) + "?suspended=1");
}

export async function reactivateStaffAction(formData: FormData) {
  const admin = await requireAdminPermission("staff.manage");
  const accountId = text(formData, "accountId", 80);
  try {
    await setStaffActive(admin, accountId, true);
  } catch (error) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }
  redirect("/admin/staff/" + encodeURIComponent(accountId) + "?reactivated=1");
}

export async function resetStaffPasswordAction(formData: FormData) {
  const admin = await requireAdminPermission("staff.manage");
  const accountId = text(formData, "accountId", 80);
  const account = await getAdminAccount(accountId);
  if (!account) redirect("/admin/staff?error=Staff+account+not+found");
  const confirm = text(formData, "confirm", 120);
  if (confirm !== "RESET " + account.username) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent("Type RESET " + account.username + " to confirm."),
    );
  }

  try {
    await resetStaffPassword(
      admin,
      accountId,
      text(formData, "temporaryPassword", 128),
    );
  } catch (error) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/staff/" + encodeURIComponent(accountId) + "?passwordReset=1");
}

export async function deleteStaffAction(formData: FormData) {
  const admin = await requireAdminPermission("staff.manage");
  const accountId = text(formData, "accountId", 80);
  const account = await getAdminAccount(accountId);
  if (!account) redirect("/admin/staff?error=Staff+account+not+found");
  const confirm = text(formData, "confirm", 120);
  if (confirm !== "DELETE " + account.username) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent("Type DELETE " + account.username + " to confirm."),
    );
  }

  try {
    await deleteStaffAccount(admin, accountId);
  } catch (error) {
    redirect(
      "/admin/staff/" +
        encodeURIComponent(accountId) +
        "?error=" +
        encodeURIComponent(errorMessage(error)),
    );
  }

  redirect("/admin/staff?deleted=1");
}
