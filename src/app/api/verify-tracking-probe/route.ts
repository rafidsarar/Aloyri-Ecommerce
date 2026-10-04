export const dynamic = "force-dynamic";

export async function GET() {
  const response = await fetch("https://aloyri-ecommerce.vercel.app/api/track-order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orderNumber: "WEB-SMOKE-DOES-NOT-EXIST",
      phone: "01700000000",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = { parseError: true };
  }

  return Response.json({
    upstreamStatus: response.status,
    upstreamBody: body,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
