import { cartRecoveryReadiness } from "@/lib/cart-recovery";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = cartRecoveryReadiness();
  return Response.json(
    {
      enabled: status.enabled,
      domainReady: status.domainReady,
      senderReady: status.senderReady,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
