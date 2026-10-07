import {
  currentCustomerSession,
  customerAuthReadiness,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [session, readiness] = await Promise.all([
    currentCustomerSession(),
    Promise.resolve(customerAuthReadiness()),
  ]);
  return Response.json(
    {
      enabled: readiness.enabled,
      domainReady: readiness.domainReady,
      senderReady: readiness.senderReady,
      switchEnabled: readiness.switchEnabled,
      authMethods: {
        google: readiness.googleEnabled,
        emailLink: readiness.emailLinkEnabled,
      },
      googleConfigured: readiness.googleConfigured,
      googleSwitchEnabled: readiness.googleSwitchEnabled,
      authenticated: Boolean(session),
      ...(session
        ? { authMethod: session.session.method || "email-link" }
        : {}),
      ...(session ? { account: session.account } : {}),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
