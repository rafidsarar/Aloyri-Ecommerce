import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { applyMerchandisingRules } from "@/lib/merchandising";
import { applyStorefrontEditorial } from "@/lib/storefront-admin-store";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.search) {
    return Response.json(
      { error: "Query parameters are not supported.", code: "INVALID_REQUEST" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [result, config] = await Promise.all([
    fetchCrmCatalog(),
    readStorefrontConfig(),
  ]);

  const body = result.ok
    ? {
        ...result.body,
        products: applyMerchandisingRules(
          applyStorefrontEditorial(result.body.products, config),
          config,
        ),
      }
    : result.body;

  return Response.json(body, {
    status: result.status,
    headers: result.ok
      ? {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
          "X-Content-Type-Options": "nosniff",
        }
      : {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
  });
}
