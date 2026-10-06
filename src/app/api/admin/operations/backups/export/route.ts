import { getAdminBackup, listAdminBackups } from "@/lib/admin-operations";
import {
  currentAdmin,
  hasAdminPermission,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin || !hasAdminPermission(admin, "backups.export")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("id");
  const backup = requested
    ? await getAdminBackup(requested)
    : (await listAdminBackups(1))[0];

  if (!backup) {
    return Response.json({ error: "Backup not found." }, { status: 404 });
  }

  return new Response(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition":
        'attachment; filename="aloyri-ecommerce-backup-' +
        backup.id +
        '.json"',
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
