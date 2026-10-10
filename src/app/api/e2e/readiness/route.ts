import { countStructuredRecords, currentRecordNamespace, structuredDatastoreConfigured } from "@/lib/structured-record-store";
import { e2eCrmEndpointAllowed, e2eMediaEndpointAllowed } from "@/lib/e2e-isolation";

export const dynamic = "force-dynamic";

const reply = (data: object, status: number) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

/** Read-only certification preflight. Not available in the live application. */
export async function GET() {
  if (process.env.ALOYRI_E2E_MODE !== "1" || process.env.VERCEL_ENV !== "preview") {
    return reply({ error: "Not found." }, 404);
  }
  const databaseIsolated = Boolean(
    process.env.ALOYRI_E2E_NEON_PROJECT_ID &&
    process.env.NEON_PROJECT_ID === process.env.ALOYRI_E2E_NEON_PROJECT_ID &&
    structuredDatastoreConfigured(),
  );
  const orderingDisabled = process.env.ALOYRI_ORDERING_ENABLED !== "1";
  const customerAuthDisabled = process.env.ALOYRI_CUSTOMER_AUTH_ENABLED !== "1";
  const googleAuthDisabled = process.env.ALOYRI_GOOGLE_AUTH_ENABLED !== "1";
  const blobDisabled = process.env.ALOYRI_LEGACY_BLOB_FALLBACK !== "1";
  if (!databaseIsolated || !orderingDisabled || !customerAuthDisabled || !googleAuthDisabled || !blobDisabled) {
    return reply({ status: "blocked", code: "E2E_ISOLATION_INVARIANT_FAILED" }, 503);
  }
  try {
    const recordCount = await countStructuredRecords();
    return reply({
      status: "isolated",
      database: { reachable: true, namespace: currentRecordNamespace(), recordCount },
      crm: { testEndpointApproved: e2eCrmEndpointAllowed(process.env.CRM_INTEGRATION_URL) },
      media: { testEndpointApproved: e2eMediaEndpointAllowed(process.env.SUPABASE_MEDIA_GATEWAY_URL) },
      orderingDisabled,
      customerAuthDisabled,
      googleAuthDisabled,
      blobDisabled,
    }, 200);
  } catch {
    return reply({ status: "blocked", code: "E2E_DATABASE_UNAVAILABLE" }, 503);
  }
}
