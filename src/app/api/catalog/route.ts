import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
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
        products: result.body.products.map((product) => {
          const editorial = config.products[product.id];
          if (!editorial) return product;

          return {
            ...product,
            ...(editorial.slug ? { slug: editorial.slug } : {}),
            ...(editorial.description
              ? { description: editorial.description }
              : {}),
            ...(editorial.routineStep
              ? { routineStep: editorial.routineStep }
              : {}),
            ...(editorial.skinNote ? { skinNote: editorial.skinNote } : {}),
            ...(editorial.texture ? { texture: editorial.texture } : {}),
            ...(editorial.bestFor ? { bestFor: editorial.bestFor } : {}),
            ...(editorial.howToUse?.length
              ? { howToUse: editorial.howToUse }
              : {}),
            ...(editorial.careNotes?.length
              ? { careNotes: editorial.careNotes }
              : {}),
            ...(editorial.ingredientNote
              ? { ingredientNote: editorial.ingredientNote }
              : {}),
            ...(typeof editorial.featured === "boolean"
              ? { featured: editorial.featured }
              : {}),
            ...(typeof editorial.bestseller === "boolean"
              ? { bestseller: editorial.bestseller }
              : {}),
            ...(editorial.mediaPath
              ? { mediaPath: editorial.mediaPath }
              : {}),
          };
        }),
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
