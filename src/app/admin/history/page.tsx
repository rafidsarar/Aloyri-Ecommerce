import Link from "next/link";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { restoreVersionToDraftAction } from "@/app/admin/actions";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { hasAdminPermission, requireAdminPermission } from "@/lib/admin-auth";
import { listAdminAuditEvents, listStorefrontVersions, readPublishedStorefrontConfig } from "@/lib/storefront-admin-store";

function when(value: string) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(value));
}

export default async function StorefrontHistoryPage({ searchParams }: {
  searchParams: Promise<{ restored?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("publishing.view");
  const canRestore = admin.role === "owner" && hasAdminPermission(admin, "publishing.restore");
  const [query, versions, audit, live] = await Promise.all([
    searchParams, listStorefrontVersions(30), listAdminAuditEvents(12), readPublishedStorefrontConfig(),
  ]);
  return <AdminShell username={admin.username} title="Version history" subtitle="Changes go live as soon as you save. Restore a previous version if you need to undo a change.">
    {query.restored ? <AdminNotice>Previous storefront version restored to the live website.</AdminNotice> : null}
    {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}
    <div className="grid gap-4 sm:grid-cols-2">
      <AdminCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-black/50">Live storefront</p>
        <p className="mt-3 text-lg font-semibold">Automatic updates enabled</p>
        <p className="mt-2 text-xs text-black/60">Last updated {when(live.updatedAt)}</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-black/10 px-4 text-sm font-semibold">View live storefront</Link>
      </AdminCard>
      <AdminCard>
        <p className="text-xs font-semibold uppercase tracking-widest text-black/50">Saved versions</p>
        <p className="mt-3 text-3xl font-semibold">{versions.length}</p>
        <p className="mt-2 text-xs text-black/60">Automatic snapshots of storefront changes.</p>
      </AdminCard>
    </div>
    <AdminCard>
      <h2 className="text-lg font-semibold">Previous versions</h2>
      <p className="mt-2 text-sm text-black/60">Restoring a version immediately replaces live storefront settings. This action is restricted to the Owner.</p>
      <div className="mt-5 grid gap-4">
        {versions.length === 0 ? <p className="text-sm text-black/60">No saved versions yet. Saving storefront changes will create snapshots automatically.</p> : null}
        {versions.map(version => <div key={version.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{when(version.publishedAt)}</p>
            <p className="mt-1 break-words text-xs text-black/60">{version.note || "Storefront saved"} · {version.publishedBy}</p>
          </div>
          {canRestore ? <form action={restoreVersionToDraftAction}>
            <input type="hidden" name="versionId" value={version.id}/>
            <AdminSubmitButton className="min-h-11 rounded-xl border border-[#713a35]/20 px-4 text-sm font-semibold text-[#713a35]">Restore live</AdminSubmitButton>
          </form> : null}
        </div>)}
      </div>
    </AdminCard>
    <AdminCard>
      <h2 className="text-lg font-semibold">Recent Admin activity</h2>
      <div className="mt-4 grid gap-3">
        {audit.map(event => <div key={event.id} className="rounded-xl border border-black/10 p-3">
          <p className="text-sm font-semibold">{event.action}</p>
          <p className="mt-1 text-xs text-black/60">{when(event.createdAt)} · {event.actor}</p>
        </div>)}
      </div>
    </AdminCard>
  </AdminShell>;
}
