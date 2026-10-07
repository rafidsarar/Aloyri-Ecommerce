import { sendDueProductAlerts } from "@/lib/product-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await sendDueProductAlerts(100);
  return Response.json(result, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
