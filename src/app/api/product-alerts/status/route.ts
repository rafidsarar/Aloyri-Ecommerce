import { currentCustomerSession } from "@/lib/customer-auth";
import { productAlertsReadiness } from "@/lib/product-alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  const [readiness, session] = await Promise.all([
    Promise.resolve(productAlertsReadiness()),
    currentCustomerSession(),
  ]);
  return Response.json(
    {
      enabled: readiness.enabled,
      domainReady: readiness.domainReady,
      senderReady: readiness.senderReady,
      switchEnabled: readiness.switchEnabled,
      authenticated: Boolean(session),
      ...(session ? { email: session.account.email } : {}),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
