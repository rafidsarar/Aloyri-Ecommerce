import { cancelProductAlertByToken } from "@/lib/product-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const cancelled = await cancelProductAlertByToken(token);
  return new Response(
    `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:40px;background:#fffaf7;color:#321f1c"><main style="max-width:560px;margin:auto"><h1>${cancelled ? "Product alert stopped." : "This alert link is no longer active."}</h1><p>${cancelled ? "Aloyri will not send this product alert again." : "No active alert was found."}</p><a href="/" style="color:#713a35">Return to Aloyri</a></main></body></html>`,
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
