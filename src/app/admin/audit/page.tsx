import {
  AdminCard,
  AdminShell,
} from "@/components/admin/admin-shell";
import {
  hasAdminPermission,
  requireAdminPermission,
} from "@/lib/admin-auth";
import { listAdminAuditEvents } from "@/lib/storefront-admin-store";

function when(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function AuditPage() {
  const admin = await requireAdminPermission("audit.view");
  const events = await listAdminAuditEvents(100);

  return (
    <AdminShell
      username={admin.username}
      title="Admin audit history"
      subtitle="Immutable private activity history showing who changed website content, access, publishing, security and operations."
    >
      <div className="mb-5 flex justify-end">
        {hasAdminPermission(admin, "audit.export") ? (
          <a
            href="/api/admin/audit/export"
            className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
          >
            Export CSV
          </a>
        ) : null}
      </div>

      <AdminCard>
        {events.length ? (
          <div className="divide-y divide-black/7">
            {events.map((event) => (
              <div key={event.id} className="py-4">
                <div className="grid gap-2 md:grid-cols-[190px_180px_1fr] md:items-start">
                  <div>
                    <p className="text-xs font-semibold">{when(event.createdAt)}</p>
                    <p className="mt-1 text-[11px] text-black/38">{event.actor}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#713a35]">{event.action}</p>
                    <p className="mt-1 text-[11px] text-black/38">
                      {[event.scope, event.target].filter(Boolean).join(" · ") || "General"}
                    </p>
                  </div>
                  <div>
                    {event.detail ? (
                      <p className="text-sm leading-6 text-black/55">{event.detail}</p>
                    ) : null}
                    {event.changes?.length ? (
                      <div className="mt-3 grid gap-2">
                        {event.changes.slice(0, 12).map((change, index) => (
                          <div
                            key={change.path + index}
                            className="rounded-lg bg-[#f7f4f2] px-3 py-2 text-xs"
                          >
                            <p className="font-semibold">{change.path}</p>
                            <p className="mt-1 break-words text-black/45">
                              {change.before ?? "∅"} → {change.after ?? "∅"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-black/45">
            No audit events yet.
          </p>
        )}
      </AdminCard>
    </AdminShell>
  );
}
