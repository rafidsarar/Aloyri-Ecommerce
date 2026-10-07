import { sendDueLifecycleEmails } from "@/lib/lifecycle-email-queue";
import { sendDueProductAlerts } from "@/lib/product-alerts";
import { migrateLegacyBlobRecords } from "@/lib/structured-record-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [productAlerts, lifecycle, datastoreMigration] = await Promise.all([
    sendDueProductAlerts(100),
    sendDueLifecycleEmails(100),
    migrateLegacyBlobRecords(),
  ]);

  return Response.json(
    { productAlerts, lifecycle, datastoreMigration },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
