import { unstable_rethrow } from "next/navigation";
import type { LiveCatalogProduct } from "@/lib/catalog";
import { recordRuntimeError } from "@/lib/runtime-error-store";

const enc = new TextEncoder();

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function sha256Hex(value: string) {
  return hex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))),
  );
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))),
  );
}

function safeProduct(value: unknown): LiveCatalogProduct | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;

  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.brand !== "string" ||
    typeof item.size !== "string" ||
    typeof item.category !== "string" ||
    typeof item.price !== "number" ||
    typeof item.active !== "boolean" ||
    typeof item.availableStock !== "number" ||
    (item.salePrice !== undefined && typeof item.salePrice !== "number") ||
    (item.promotionBadge !== undefined && typeof item.promotionBadge !== "string")
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    size: item.size,
    category: item.category,
    price: item.price,
    active: item.active,
    availableStock: Math.max(0, Math.floor(item.availableStock)),
    ...(typeof item.salePrice === "number" && item.salePrice >= 0 && item.salePrice < item.price
      ? { salePrice: item.salePrice }
      : {}),
    ...(typeof item.promotionBadge === "string" && item.promotionBadge.trim()
      ? { promotionBadge: item.promotionBadge.trim().slice(0, 40) }
      : {}),
  };
}

export async function fetchCrmCatalog() {
  const baseUrl = process.env.CRM_INTEGRATION_URL?.replace(/\/$/, "");
  const integrationId = process.env.CRM_INTEGRATION_ID;
  const secret = process.env.CRM_INTEGRATION_SECRET;
  const protectionBypass = process.env.CRM_VERCEL_BYPASS_SECRET;

  if (!baseUrl || !integrationId || !secret) {
    return {
      ok: false as const,
      status: 503,
      body: { error: "Catalog sync is not configured.", code: "CATALOG_NOT_CONFIGURED" },
    };
  }

  const path = "/api/integrations/ecommerce/catalog";
  const body = "";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const idempotencyKey = `catalog:${nonce}`;
  const bodyHash = await sha256Hex(body);
  const canonical = [
    "GET",
    path,
    integrationId,
    timestamp,
    nonce,
    idempotencyKey,
    bodyHash,
  ].join("\n");
  const signature = await hmacSha256Hex(secret, canonical);

  const headers: Record<string, string> = {
    "x-aloyri-integration": integrationId,
    "x-aloyri-timestamp": timestamp,
    "x-aloyri-nonce": nonce,
    "x-aloyri-signature": signature,
    "idempotency-key": idempotencyKey,
  };

  if (protectionBypass) {
    headers["x-vercel-protection-bypass"] = protectionBypass;
  }

  try {
    const response = await fetch(baseUrl + path, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await response.json()) as {
      products?: unknown[];
      generatedAt?: unknown;
      workspaceUpdatedAt?: unknown;
      error?: string;
      code?: string;
    };

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        body: {
          error: json.error || "Catalog sync failed.",
          code: json.code || "CATALOG_UNAVAILABLE",
        },
      };
    }

    const safeProducts = Array.isArray(json.products)
      ? json.products.map(safeProduct).filter((item): item is LiveCatalogProduct => Boolean(item))
      : [];

    return {
      ok: true as const,
      status: 200,
      body: {
        products: safeProducts,
        generatedAt:
          typeof json.generatedAt === "string" ? json.generatedAt : new Date().toISOString(),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("CRM catalog request failed", error);
    await recordRuntimeError("crm.catalog", error);
    return {
      ok: false as const,
      status: 503,
      body: { error: "Catalog sync is temporarily unavailable.", code: "CATALOG_UNAVAILABLE" },
    };
  }
}
