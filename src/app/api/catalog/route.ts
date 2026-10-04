import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.search) {
    return Response.json(
      { error: "Query parameters are not supported.", code: "INVALID_REQUEST" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await fetchCrmCatalog();

  return Response.json(result.body, {
    status: result.status,
    headers: result.ok
      ? {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
          "X-Content-Type-Options": "nosniff",
        }
      : {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
  });
}
