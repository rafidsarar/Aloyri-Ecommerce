import { mergeLiveCatalog } from "@/lib/catalog";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";
import type {
  PostPurchaseBatchResponse,
  PostPurchaseProduct,
  PostPurchaseSuggestion,
} from "@/lib/post-purchase-types";
import { rateAllowed, requestIp } from "@/lib/request-rate-limit";
import {
  buildRoutineSuggestions,
  replenishmentEstimate,
} from "@/lib/retention-utils";
import { matchesTrackedItem } from "@/lib/review-utils";

export const dynamic = "force-dynamic";

function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safeOrder(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (
    typeof input.orderNumber !== "string" ||
    !/^WEB-[A-Z0-9-]{8,90}$/i.test(input.orderNumber.trim()) ||
    typeof input.phone !== "string" ||
    !isValidBangladeshPhone(input.phone)
  ) {
    return null;
  }
  return {
    orderNumber: input.orderNumber.trim().toUpperCase(),
    phone: normalizeBangladeshPhone(input.phone),
  };
}

export async function POST(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return response({ error: "Invalid request." }, 415);
  }

  if (!rateAllowed("post-purchase", requestIp(request), 12, 5 * 60_000)) {
    return response({ error: "Too many order refresh attempts." }, 429);
  }

  const raw = await request.text();
  if (raw.length > 10_000) return response({ error: "Request too large." }, 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return response({ error: "Invalid request." }, 400);
  }

  if (!Array.isArray(body.orders) || body.orders.length < 1 || body.orders.length > 8) {
    return response({ error: "Add between 1 and 8 recent orders." }, 400);
  }

  const orders = body.orders.map(safeOrder);
  if (orders.some((order) => !order)) {
    return response({ error: "Check the order number and mobile number." }, 400);
  }

  const catalogResult = await fetchCrmCatalog();
  const catalog = catalogResult.ok ? mergeLiveCatalog(catalogResult.body.products) : [];
  const results: PostPurchaseBatchResponse["results"] = [];

  for (const input of orders as Array<{ orderNumber: string; phone: string }>) {
    const tracking = await fetchCrmOrderTracking(input);
    if (!tracking.ok) {
      results.push({
        ok: false,
        orderNumber: input.orderNumber,
        code: tracking.body.code,
        error: tracking.body.error,
      });
      continue;
    }

    const reviewEligible =
      (tracking.body.status === "Delivered" || tracking.body.status === "Returned") &&
      Boolean(tracking.body.deliveredDate);
    const mapped: PostPurchaseProduct[] = [];

    if (catalogResult.ok) {
      for (const item of tracking.body.items) {
        const product = catalog.find((candidate) =>
          matchesTrackedItem(candidate, item),
        );
        if (!product) continue;
        mapped.push({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          size: product.size,
          category: product.category,
          qty: item.qty,
          price: product.price,
          ...(typeof product.salePrice === "number"
            ? { salePrice: product.salePrice }
            : {}),
          availableStock: product.availableStock ?? 0,
          reviewEligible,
          replenishment:
            reviewEligible && tracking.body.deliveredDate
              ? replenishmentEstimate(
                  tracking.body.deliveredDate,
                  product.category,
                  item.qty,
                )
              : null,
        });
      }
    }

    const purchasedIds = mapped.map((product) => product.productId);
    const suggestions: PostPurchaseSuggestion[] = catalogResult.ok
      ? buildRoutineSuggestions(purchasedIds, catalog, 3).map((product) => ({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          ...(typeof product.salePrice === "number"
            ? { salePrice: product.salePrice }
            : {}),
          availableStock: product.availableStock ?? 0,
          reason: purchasedIds.length
            ? "Complements products from this order."
            : "A current in-stock routine option.",
        }))
      : [];

    results.push({
      ok: true,
      order: tracking.body,
      products: mapped,
      suggestions,
      catalogAvailable: catalogResult.ok,
    });
  }

  return response({ results } satisfies PostPurchaseBatchResponse);
}
