import {
  rotateAllAdminSessions,
  updateAdminPassword,
} from "@/app/admin/actions";
import { RecoveryCodeGenerator } from "@/components/admin/recovery-code-generator";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import {
  ADMIN_SESSION_SECONDS,
  adminRecoveryStatus,
  requireAdminPage,
} from "@/lib/admin-auth";

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{
    passwordChanged?: string;
    passwordError?: string;
    sessionsRotated?: string;
    recovered?: string;
  }>;
}) {
  const admin = await requireAdminPage();
  const [query, recovery] = await Promise.all([
    searchParams,
    adminRecoveryStatus(),
  ]);

  return (
    <AdminShell
      username={admin.username}
      title="Account security"
      subtitle="Protect Ecommerce Admin separately from CRM with password rotation, one-time recovery codes and session invalidation."
    >
      {query.passwordChanged ? (
        <AdminNotice>Password changed and all older sessions were invalidated.</AdminNotice>
      ) : null}
      {query.sessionsRotated ? (
        <AdminNotice>All older admin sessions were invalidated.</AdminNotice>
      ) : null}
      {query.recovered ? (
        <AdminNotice>Account recovered successfully. A new session is active.</AdminNotice>
      ) : null}
      {query.passwordError ? (
        <AdminNotice tone="warning">{query.passwordError}</AdminNotice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <form action={updateAdminPassword}>
          <AdminCard>
            <p className="text-sm font-semibold">Change password</p>
            <p className="mt-1 text-xs leading-5 text-black/45">
              Changing your password rotates the session signing key, so other
              logged-in browsers are signed out automatically.
            </p>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                New password
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Confirm new password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
            </div>
            <button className="mt-4 rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
              Change password
            </button>
          </AdminCard>
        </form>

        <AdminCard>
          <p className="text-sm font-semibold">Session control</p>
          <p className="mt-1 text-xs leading-5 text-black/45">
            Admin sessions expire after {Math.round(ADMIN_SESSION_SECONDS / 3600)} hours.
            Use this if you signed in on another device or think a session may
            still be active.
          </p>
          <form action={rotateAllAdminSessions} className="mt-5">
            <button className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
              Sign out every other session
            </button>
          </form>
        </AdminCard>
      </div>

      <AdminCard className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Recovery codes</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-black/45">
              Recovery codes let you reset the Ecommerce Admin password without
              CRM access. Store them somewhere separate from this browser.
            </p>
          </div>
          <span className="rounded-full bg-[#f2e8e4] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#713a35]">
            {recovery.remaining} remaining
          </span>
        </div>
        <div className="mt-5">
          <RecoveryCodeGenerator />
        </div>
      </AdminCard>
    </AdminShell>
  );
}
