import { notFound } from "next/navigation";
import {
  deleteStaffAction,
  reactivateStaffAction,
  resetStaffPasswordAction,
  suspendStaffAction,
  updateStaffAction,
} from "@/app/admin/staff/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { PermissionGrid } from "@/components/admin/permission-grid";
import {
  getAdminAccount,
  hasAdminPermission,
  requireAdminPermission,
} from "@/lib/admin-auth";

export default async function StaffEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    suspended?: string;
    reactivated?: string;
    passwordReset?: string;
    error?: string;
  }>;
}) {
  const admin = await requireAdminPermission("staff.view");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const account = await getAdminAccount(id);
  if (!account) notFound();
  const canManage = hasAdminPermission(admin, "staff.manage");
  const canDangerous = admin.role === "owner";
  const owner = account.role === "owner";

  return (
    <AdminShell
      username={admin.username}
      title={account.displayName}
      subtitle={"@" + account.username + " · " + account.role.replace(/-/g, " ")}
    >
      {query.created ? <AdminNotice>Staff account created.</AdminNotice> : null}
      {query.saved ? <AdminNotice>Staff access updated.</AdminNotice> : null}
      {query.suspended ? <AdminNotice>Account suspended and existing sessions revoked.</AdminNotice> : null}
      {query.reactivated ? <AdminNotice>Account reactivated.</AdminNotice> : null}
      {query.passwordReset ? <AdminNotice>Temporary password set and existing sessions revoked.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <form action={updateStaffAction} className="grid gap-5">
        <input type="hidden" name="accountId" value={account.id} />
        <AdminCard>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Display name
              <input
                name="displayName"
                defaultValue={account.displayName}
                maxLength={80}
                disabled={!canManage}
                className="rounded-xl border border-black/10 px-4 py-3 disabled:bg-black/3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Username
              <input
                value={account.username}
                disabled
                className="rounded-xl border border-black/10 bg-black/3 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Role
              <select
                name="role"
                defaultValue={account.role}
                disabled={!canManage || owner}
                className="rounded-xl border border-black/10 px-4 py-3 disabled:bg-black/3"
              >
                {owner ? <option value="owner">Owner</option> : null}
                <option value="website-manager">Website Manager</option>
                <option value="content-editor">Content Editor</option>
                <option value="merchandising-manager">Merchandising Manager</option>
                <option value="analyst">Analyst</option>
                <option value="support">Support</option>
              </select>
            </label>
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className="mt-2 text-sm text-black/55">
                {account.active ? "Active" : "Suspended"}
                {account.mustChangePassword ? " · password change required" : ""}
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Permissions</p>
          <p className="mt-1 text-xs text-black/45">
            Owner always has every permission. Other roles can be customized.
          </p>
          <div className="mt-5">
            <PermissionGrid
              selected={account.permissions}
              disabled={!canManage || owner}
            />
          </div>
        </AdminCard>

        {canManage ? (
          <div className="flex justify-end">
            <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
              Save access
            </button>
          </div>
        ) : null}
      </form>

      {canDangerous && !owner ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <AdminCard>
            <p className="text-sm font-semibold">Account state</p>
            {account.active ? (
              <form action={suspendStaffAction} className="mt-4 grid gap-3">
                <input type="hidden" name="accountId" value={account.id} />
                <label className="grid gap-1.5 text-sm font-medium">
                  Type <strong>SUSPEND {account.username}</strong>
                  <input
                    name="confirm"
                    required
                    className="rounded-xl border border-red-200 px-4 py-3"
                  />
                </label>
                <button className="w-fit rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
                  Suspend and revoke sessions
                </button>
              </form>
            ) : (
              <form action={reactivateStaffAction} className="mt-4">
                <input type="hidden" name="accountId" value={account.id} />
                <button className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
                  Reactivate account
                </button>
              </form>
            )}
          </AdminCard>

          <AdminCard>
            <p className="text-sm font-semibold">Reset staff password</p>
            <form action={resetStaffPasswordAction} className="mt-4 grid gap-3">
              <input type="hidden" name="accountId" value={account.id} />
              <input
                name="temporaryPassword"
                type="password"
                minLength={12}
                maxLength={128}
                required
                placeholder="New temporary password"
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <input
                name="confirm"
                required
                placeholder={"Type RESET " + account.username}
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <button className="w-fit rounded-xl border border-[#713a35]/16 px-5 py-3 text-sm font-semibold text-[#713a35]">
                Reset password and revoke sessions
              </button>
            </form>
          </AdminCard>

          <AdminCard className="xl:col-span-2">
            <p className="text-sm font-semibold text-red-700">Delete staff account</p>
            <p className="mt-1 text-xs text-black/45">
              This removes the Ecommerce Admin account permanently. Audit history remains.
            </p>
            <form action={deleteStaffAction} className="mt-4 flex flex-wrap gap-3">
              <input type="hidden" name="accountId" value={account.id} />
              <input
                name="confirm"
                required
                placeholder={"Type DELETE " + account.username}
                className="min-w-[280px] rounded-xl border border-red-200 px-4 py-3"
              />
              <button className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
                Delete account
              </button>
            </form>
          </AdminCard>
        </div>
      ) : null}
    </AdminShell>
  );
}
