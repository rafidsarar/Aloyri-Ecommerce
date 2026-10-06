import {
  currentAdmin,
  hasAdminPermission,
} from "@/lib/admin-auth";
import { listAdminAuditEvents } from "@/lib/storefront-admin-store";

export const dynamic = "force-dynamic";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text)
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
}

export async function GET() {
  const admin = await currentAdmin();
  if (
    !admin ||
    admin.mustChangePassword ||
    !hasAdminPermission(admin, "audit.export")
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await listAdminAuditEvents(5000);
  const rows = [
    ["created_at", "actor", "action", "scope", "target", "detail", "changes"],
    ...events.map((event) => [
      event.createdAt,
      event.actor,
      event.action,
      event.scope || "",
      event.target || "",
      event.detail || "",
      event.changes
        ?.map(
          (change) =>
            change.path +
            ": " +
            (change.before ?? "∅") +
            " -> " +
            (change.after ?? "∅"),
        )
        .join(" | ") || "",
    ]),
  ];

  return new Response(
    rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n",
    {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="aloyri-admin-audit.csv"',
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
