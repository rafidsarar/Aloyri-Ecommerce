import {
  createBackupAction,
  restoreBackupAction,
  runHealthCheckAction,
} from "@/app/admin/operations/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import {
  hasAdminPermission,
  requireAdminPermission,
} from "@/lib/admin-auth";
import {
  listAdminBackups,
  listOperationalHealthSnapshots,
  runOperationalHealth,
} from "@/lib/admin-operations";
import { listAdminAuditEvents } from "@/lib/storefront-admin-store";

function when(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function stateClass(state: "healthy" | "warning" | "error") {
  if (state === "healthy") return "bg-emerald-50 text-emerald-700";
  if (state === "warning") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    healthRun?: string;
    backupCreated?: string;
    backupRestored?: string;
    error?: string;
  }>;
}) {
  const admin = await requireAdminPermission("health.view");
  const [query, live, history, backups, audit] = await Promise.all([
    searchParams,
    runOperationalHealth(admin.username, false),
    listOperationalHealthSnapshots(10),
    hasAdminPermission(admin, "backups.view")
      ? listAdminBackups(20)
      : Promise.resolve([]),
    listAdminAuditEvents(30),
  ]);
  const canRun = hasAdminPermission(admin, "health.run");
  const canCreateBackup = hasAdminPermission(admin, "backups.create");
  const canExportBackup = hasAdminPermission(admin, "backups.export");
  const canRestore =
    admin.role === "owner" && hasAdminPermission(admin, "backups.restore");
  const recentIncidents = audit.filter(
    (event) =>
      /failed|error|unavailable/i.test(event.action) ||
      /failed|error|unavailable/i.test(event.detail || ""),
  );

  return (
    <AdminShell
      username={admin.username}
      title="Operational health"
      subtitle="Read-only checks across the storefront datastore, CRM catalog/order bridge, analytics, staff directory and current runtime. Backups contain website-owned configuration only—never CRM operational data."
    >
      {query.healthRun ? <AdminNotice>Health snapshot saved.</AdminNotice> : null}
      {query.backupCreated ? <AdminNotice>Private Ecommerce Admin backup created.</AdminNotice> : null}
      {query.backupRestored ? (
        <AdminNotice>
          Backup restored to Draft only. Review it in Publishing before anything goes live.
        </AdminNotice>
      ) : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Overall
          </p>
          <p className="mt-3 text-2xl font-semibold capitalize">{live.overall}</p>
          <span className={"mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] " + stateClass(live.overall)}>
            live check
          </span>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Runtime
          </p>
          <p className="mt-3 text-lg font-semibold capitalize">{live.environment}</p>
          <p className="mt-1 text-xs text-black/42">
            {live.commitSha ? live.commitSha.slice(0, 12) : "Commit unknown"}
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Saved health checks
          </p>
          <p className="mt-3 text-3xl font-semibold">{history.length}</p>
          <p className="mt-1 text-xs text-black/42">Latest retained view</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Recent failure signals
          </p>
          <p className="mt-3 text-3xl font-semibold">{recentIncidents.length}</p>
          <p className="mt-1 text-xs text-black/42">From private application audit</p>
        </AdminCard>
      </div>

      <AdminCard className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Current health checks</p>
            <p className="mt-1 text-xs text-black/45">
              These checks do not create orders or modify CRM data.
            </p>
          </div>
          {canRun ? (
            <form action={runHealthCheckAction}>
              <button className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
                Run & save health check
              </button>
            </form>
          ) : null}
        </div>
        <div className="mt-5 divide-y divide-black/7">
          {live.checks.map((check) => (
            <div
              key={check.id}
              className="grid gap-3 py-4 md:grid-cols-[180px_150px_1fr] md:items-center"
            >
              <p className="text-sm font-semibold">{check.label}</p>
              <span className={"w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] " + stateClass(check.state)}>
                {check.state}
              </span>
              <p className="text-sm text-black/48">{check.detail}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      {hasAdminPermission(admin, "backups.view") ? (
        <AdminCard className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Website configuration backups</p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-black/45">
                Includes Published/Draft content, SEO, campaigns, collections, merchandising and staff role/permission metadata. Credential hashes, recovery codes, session secrets and CRM data are excluded.
              </p>
            </div>
            {canExportBackup ? (
              <a
                href="/api/admin/operations/backups/export"
                className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
              >
                Export latest JSON
              </a>
            ) : null}
          </div>

          {canCreateBackup ? (
            <form action={createBackupAction} className="mt-5 flex flex-wrap gap-3">
              <input
                name="note"
                maxLength={300}
                placeholder="Backup note"
                className="min-w-[280px] flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm"
              />
              <button className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white">
                Create private backup
              </button>
            </form>
          ) : null}

          <div className="mt-5 divide-y divide-black/7">
            {backups.length ? (
              backups.map((backup) => (
                <div key={backup.id} className="grid gap-4 py-4 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-semibold">{backup.note}</p>
                    <p className="mt-1 text-xs text-black/42">
                      {when(backup.createdAt)} · {backup.createdBy} · {backup.id}
                    </p>
                  </div>
                  {canRestore ? (
                    <form action={restoreBackupAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="backupId" value={backup.id} />
                      <input
                        name="confirm"
                        required
                        placeholder={"Type RESTORE " + backup.id}
                        className="min-w-[260px] rounded-lg border border-amber-200 px-3 py-2 text-xs"
                      />
                      <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                        Restore to Draft
                      </button>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="py-5 text-sm text-black/45">No manual backups yet.</p>
            )}
          </div>
        </AdminCard>
      ) : null}

      <AdminCard className="mt-5">
        <p className="text-sm font-semibold">Saved health history</p>
        <div className="mt-4 divide-y divide-black/7">
          {history.length ? (
            history.map((snapshot) => (
              <div key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>{when(snapshot.checkedAt)} · {snapshot.checkedBy}</span>
                <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] " + stateClass(snapshot.overall)}>
                  {snapshot.overall}
                </span>
              </div>
            ))
          ) : (
            <p className="py-3 text-sm text-black/45">No saved health snapshots yet.</p>
          )}
        </div>
      </AdminCard>
    </AdminShell>
  );
}
