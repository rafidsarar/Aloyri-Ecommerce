import {
  createStaffAction,
} from "@/app/admin/staff/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";

export default async function NewStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdminPermission("staff.manage");
  const query = await searchParams;

  return (
    <AdminShell
      username={admin.username}
      title="Add staff account"
      subtitle="Create a separate Ecommerce Admin login. New staff are forced to replace the temporary password on first sign-in."
    >
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <form action={createStaffAction} className="grid gap-5">
        <AdminCard>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Display name
              <input
                name="displayName"
                maxLength={80}
                required
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Username
              <input
                name="username"
                minLength={3}
                maxLength={48}
                required
                autoComplete="off"
                className="rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Role template
              <select
                name="role"
                defaultValue="content-editor"
                className="rounded-xl border border-black/10 px-4 py-3"
              >
                <option value="website-manager">Website Manager</option>
                <option value="content-editor">Content Editor</option>
                <option value="merchandising-manager">Merchandising Manager</option>
                <option value="analyst">Analyst</option>
                <option value="support">Support</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Temporary password
              <input
                name="temporaryPassword"
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
                className="rounded-xl border border-black/10 px-4 py-3"
              />
              <span className="text-xs font-normal text-black/40">
                Share it privately. The staff member must change it after login.
              </span>
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Role permissions</p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            The new account starts with the selected role template. After
            creation, open the account to customize individual permissions.
            Overview and self-security access are always retained so a staff
            member can sign in and manage their own password safely.
          </p>
        </AdminCard>

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Create staff account
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
