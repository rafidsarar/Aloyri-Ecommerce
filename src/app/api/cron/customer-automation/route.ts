import { sendDueLifecycleEmails } from "@/lib/lifecycle-email-queue";
import { sendDueProductAlerts } from "@/lib/product-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [productAlerts, lifecycle] = await Promise.all([
    sendDueProductAlerts(100),
    sendDueLifecycleEmails(100),
  ]);

  return Response.json(
    { productAlerts, lifecycle },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
