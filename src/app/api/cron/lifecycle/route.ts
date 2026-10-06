import { sendDueLifecycleEmails } from "@/lib/lifecycle-email-queue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return Response.json(await sendDueLifecycleEmails(100), {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
