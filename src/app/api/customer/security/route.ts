import {
  customerSecuritySummary,
  revokeOtherCustomerSessions,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET() {
  try {
    return reply(await customerSecuritySummary());
  } catch {
    return reply({ error: "Sign in required." }, 401);
  }
}

export async function POST(request: Request) {
  if (request.headers.get("content-type") && !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply({ error: "Invalid request content type." }, 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return reply({ error: "Invalid request origin." }, 403);
  }
  try {
    const result = await revokeOtherCustomerSessions();
    return reply(result);
  } catch {
    return reply({ error: "Sign in required." }, 401);
  }
}
