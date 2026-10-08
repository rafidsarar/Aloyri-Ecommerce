import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import {
  discardDraft,
  enableDraftPreview,
  publishDraft,
  restoreVersionToDraftAction,
} from "@/app/admin/actions";
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
  getPublishingStatus,
  listAdminAuditEvents,
  listStorefrontVersions,
} from "@/lib/storefront-admin-store";

function when(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function AdminPublishingPage({
  searchParams,
}: {
  searchParams: Promise<{
    published?: string;
    discarded?: string;
    restored?: string;
    error?: string;
  }>;
}) {
  const admin = await requireAdminPermission("publishing.view");
  const canPreview = hasAdminPermission(admin, "publishing.preview");
  const canPublish = hasAdminPermission(admin, "publishing.publish");
  const canDiscard = hasAdminPermission(admin, "publishing.discard");
  const canRestore =
    admin.role === "owner" && hasAdminPermission(admin, "publishing.restore");

  const [query, status, versions, audit] = await Promise.all([
    searchParams,
    getPublishingStatus(),
    listStorefrontVersions(30),
    listAdminAuditEvents(12),
  ]);

  return (
    <AdminShell
      username={admin.username}
      title="Publishing"
      subtitle="Preview your saved changes, then publish them to your live website."
    >
      {query.published ? (
        <AdminNotice>Draft published successfully and saved to version history.</AdminNotice>
      ) : null}
      {query.discarded ? (
        <AdminNotice>Draft reset to the current live storefront.</AdminNotice>
      ) : null}
      {query.restored ? (
        <AdminNotice>
          Historical version restored to draft. Preview it before publishing.
        </AdminNotice>
      ) : null}
      {query.error ? (
        <AdminNotice tone="warning">{query.error}</AdminNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Draft status
          </p>
          <p className="mt-3 text-lg font-semibold">
            {status.hasDraftChanges ? "Changes pending" : "Matches live"}
          </p>
          <p className="mt-1 text-xs text-black/42">
            Draft updated {when(status.draft.updatedAt)}
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Live storefront
          </p>
          <p className="mt-3 text-lg font-semibold">Published</p>
          <p className="mt-1 text-xs text-black/42">
            Updated {when(status.published.updatedAt)}
          </p>
        </AdminCard>
        <AdminCard>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">
            Versions
          </p>
          <p className="mt-3 text-3xl font-semibold">{versions.length}</p>
          <p className="mt-1 text-xs text-black/42">Stored publish snapshots</p>
        </AdminCard>

      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <AdminCard>
          <p className="text-sm font-semibold">Release the current draft</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-black/45">
            Preview uses your private admin preview cookie. Customers continue
            to see the published version until Publish is pressed.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {canPreview ? (
              <form action={enableDraftPreview}>
                <input type="hidden" name="path" value="/admin/preview-device" />
                <button className="rounded-xl border border-[#713a35]/18 px-5 py-3 text-sm font-semibold text-[#713a35]">
                  Preview at device sizes
                </button>
              </form>
              <form action={enableDraftPreview}>
                <input type="hidden" name="path" value="/" />
                <button className="rounded-xl border border-[#713a35]/18 px-5 py-3 text-sm font-semibold text-[#713a35]">
                  Preview draft storefront
                </button>
              </form>
            ) : null}
            {canDiscard ? (
              <details className="w-full border-t border-black/10 pt-4"><summary className="cursor-pointer text-xs text-black/60">Reset draft changes</summary><p className="my-3 text-xs text-black/60">This replaces your saved draft with the current live website.</p><form action={discardDraft}>
                <button
                  disabled={!status.hasDraftChanges}
                  className="rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold text-black/60 disabled:opacity-40"
                >
                  Discard draft changes
                </button>
              </form></details>
            ) : null}
          </div>

          {canPublish ? (
            <form action={publishDraft} className="mt-5 grid gap-3 border-t border-black/7 pt-5">
              <label className="grid gap-1.5 text-sm font-medium">
                Publish note (optional)
                <input
                  name="note"
                  maxLength={300}
                  placeholder="Example: Updated homepage and shipping FAQ"
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <AdminSubmitButton disabled={!status.hasDraftChanges} pendingLabel="Publishing…">Publish draft to live website</AdminSubmitButton>
              {!status.hasDraftChanges ? <p className="text-xs text-black/60">Your draft matches the live website. Save an edit first to publish new changes.</p> : null}
            </form>
          ) : (
            <p className="mt-5 border-t border-black/7 pt-5 text-xs text-black/45">
              Your role can review publishing status but cannot publish the live storefront.
            </p>
          )}
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Workflow rule</p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-black/58">
            <p>
              <strong className="text-black/75">1. Edit:</strong> Homepage,
              products, pages and settings save only to Draft.
            </p>
            <p>
              <strong className="text-black/75">2. Preview:</strong> Review the
              draft against live CRM price and stock.
            </p>
            <p>
              <strong className="text-black/75">3. Publish:</strong> One explicit
              action replaces the public website content.
            </p>
            <p>
              <strong className="text-black/75">4. Restore:</strong> Any stored
              publish version can be restored to Draft first, then republished.
            </p>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="mt-5">
        <p className="text-sm font-semibold">Version history</p>
        <p className="mt-1 text-xs text-black/45">
          Restoring a version never changes the live site immediately. It is
          loaded into Draft so it can be previewed first.
        </p>

        {versions.length ? (
          <div className="mt-5 divide-y divide-black/7">
            {versions.map((version) => (
              <div
                key={version.id}
                className="grid gap-4 py-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{version.note}</p>
                  <p className="mt-1 text-xs text-black/42">
                    {when(version.publishedAt)} · {version.publishedBy}
                  </p>
                </div>
                {canRestore ? (
                  <form action={restoreVersionToDraftAction}>
                    <input type="hidden" name="versionId" value={version.id} />
                    <button className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]">
                      Restore to draft
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-black/45">
            Version history starts automatically with the first publish.
          </p>
        )}
      </AdminCard>

      <details className="mt-5 rounded-xl border border-black/10 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold">Recent admin activity</summary>
        <div className="mt-4 divide-y divide-black/7">
          {audit.length ? (
            audit.map((event) => (
              <div key={event.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{event.action}</p>
                  <span className="text-xs text-black/38">
                    {when(event.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-black/45">
                  {event.actor}
                  {event.detail ? " · " + event.detail : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="py-3 text-sm text-black/45">No audit events yet.</p>
          )}
        </div>
      </details>
    </AdminShell>
  );
}
