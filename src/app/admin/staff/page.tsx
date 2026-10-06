import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import {
  hasAdminPermission,
  listAdminAccounts,
  requireAdminPermission,
} from "@/lib/admin-auth";

function when(value?: string) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("staff.view");
  const [query, accounts] = await Promise.all([
    searchParams,
    listAdminAccounts(),
  ]);
  const canManage = hasAdminPermission(admin, "staff.manage");

  return (
    <AdminShell
      username={admin.username}
      title="Staff access"
      subtitle="Manage Ecommerce Admin staff independently from CRM. Suspensions and password resets revoke the affected account’s existing sessions."
    >
      {query.deleted ? <AdminNotice>Staff account deleted.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-black/48">
          {accounts.filter((account) => account.active).length} active · {accounts.length} total
        </p>
        {canManage ? (
          <Link
            href="/admin/staff/new"
            className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
          >
            Add staff account
          </Link>
        ) : null}
      </div>

      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-[10px] uppercase tracking-[.13em] text-black/42">
                <th className="pb-3">Account</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Permissions</th>
                <th className="pb-3">Last login</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/6">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="py-4 pr-5">
                    <p className="font-semibold">{account.displayName}</p>
                    <p className="mt-1 text-xs text-black/40">@{account.username}</p>
                  </td>
                  <td className="py-4 pr-5 capitalize">{account.role.replace(/-/g, " ")}</td>
                  <td className="py-4 pr-5">
                    <span
                      className={
                        account.active
                          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-emerald-700"
                          : "rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-red-700"
                      }
                    >
                      {account.active ? "Active" : "Suspended"}
                    </span>
                    {account.mustChangePassword ? (
                      <span className="ml-2 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-amber-700">
                        Password change due
                      </span>
                    ) : null}
                  </td>
                  <td className="py-4 pr-5">{account.permissions.length}</td>
                  <td className="py-4 pr-5 text-xs text-black/48">
                    {when(account.lastLoginAt)}
                  </td>
                  <td className="py-4">
                    <Link
                      href={"/admin/staff/" + account.id}
                      className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
