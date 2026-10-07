import { sendDueLifecycleEmails } from "@/lib/lifecycle-email-queue";
import { sendDueProductAlerts } from "@/lib/product-alerts";
import { cleanupOperationalMetadata } from "@/lib/structured-record-store";
import { sendDueCartRecoveries } from "@/lib/cart-recovery";
import { runOrderSync } from "@/lib/order-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const outcomes = await Promise.allSettled([
    sendDueProductAlerts(100), sendDueLifecycleEmails(100), sendDueCartRecoveries(50), runOrderSync(50), cleanupOperationalMetadata(),
  ]);
  const results = Object.fromEntries(["productAlerts", "lifecycle", "cartRecovery", "orderSync", "maintenance"].map((key,index)=>[key,outcomes[index].status === "fulfilled" ? outcomes[index].value : { error: "Automation task failed; inspect runtime logs." }]));

  return Response.json(
    results,
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
