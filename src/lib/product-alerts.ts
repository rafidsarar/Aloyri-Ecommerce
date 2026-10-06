import "server-only";

import { get, list } from "@vercel/blob";
import { mergeLiveCatalog, type Product } from "@/lib/catalog";
import { currentCustomerSession } from "@/lib/customer-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  brandedEmailShell,
  sendTransactionalEmail,
  transactionalEmailReadiness,
} from "@/lib/email-delivery";
import {
  readPrivateJson,
  storefrontStoragePath,
  writePrivateJson,
} from "@/lib/storefront-admin-store";
import { siteConfig } from "@/lib/site";
import { productAlertTriggers } from "@/lib/product-alert-utils";

export type ProductAlertKind = "back-in-stock" | "price-drop";
export type ProductAlertStatus = "active" | "sent" | "cancelled";

export type ProductAlertRecord = {
  version: 1;
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  email: string;
  emailHash: string;
  accountId?: string;
  kinds: ProductAlertKind[];
  sentKinds: ProductAlertKind[];
  baselinePrice: number;
  baselineStock: number;
  lastSeenPrice: number;
  lastSeenStock: number;
  unsubscribeToken: string;
  status: ProductAlertStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  cancelledAt?: string;
};

const ITEM_PREFIX = "product-alerts/items/";
const UNSUB_PREFIX = "product-alerts/unsubscribe/";

function cleanEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeKinds(value: unknown, product: Product) {
  if (!Array.isArray(value)) return [] as ProductAlertKind[];
  const allowed = new Set<ProductAlertKind>(["back-in-stock", "price-drop"]);
  const kinds = [...new Set(
    value.filter(
      (kind): kind is ProductAlertKind =>
        typeof kind === "string" && allowed.has(kind as ProductAlertKind),
    ),
  )];
  return kinds.filter(
    (kind) => kind !== "back-in-stock" || (product.availableStock ?? 0) <= 0,
  );
}

function currentPrice(product: Product) {
  return typeof product.salePrice === "number" &&
    product.salePrice >= 0 &&
    product.salePrice < product.price
    ? product.salePrice
    : product.price;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result) return null;
    return JSON.parse(await new Response(result.stream).text()) as T;
  } catch {
    return null;
  }
}

export function productAlertsReadiness() {
  const email = transactionalEmailReadiness();
  const switchEnabled = process.env.ALOYRI_PRODUCT_ALERTS_ENABLED === "1";
  return {
    enabled: email.ready && switchEnabled,
    switchEnabled,
    domainReady: email.domainReady,
    senderReady: email.senderReady,
  };
}

export async function listProductAlerts(limit = 5000) {
  const output: ProductAlertRecord[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix: storefrontStoragePath(ITEM_PREFIX),
      limit: Math.min(1000, Math.max(1, limit - output.length)),
      ...(cursor ? { cursor } : {}),
    });
    const rows = await Promise.all(
      page.blobs.map((blob) =>
        readBlobJson<ProductAlertRecord>(blob.pathname),
      ),
    );
    output.push(
      ...rows.filter(
        (row): row is ProductAlertRecord => Boolean(row),
      ),
    );
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && output.length < limit);

  return output.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createProductAlert(input: {
  productId: string;
  kinds: unknown;
}) {
  if (!productAlertsReadiness().enabled) {
    throw new Error("ALERTS_NOT_READY");
  }

  const catalogResult = await fetchCrmCatalog();
  if (!catalogResult.ok) throw new Error("CATALOG_UNAVAILABLE");
  const catalog = mergeLiveCatalog(catalogResult.body.products);
  const product = catalog.find((row) => row.id === input.productId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const session = await currentCustomerSession();
  if (!session) throw new Error("SIGN_IN_REQUIRED");
  const email = cleanEmail(session.account.email);
  if (!email) throw new Error("INVALID_EMAIL");
  const kinds = safeKinds(input.kinds, product);
  if (!kinds.length) throw new Error("NO_ALERT_KIND");

  const emailHash = await sha256("aloyri-alert-email-v1:" + email);
  const keyHash = await sha256(
    "aloyri-alert-key-v1:" + emailHash + ":" + product.id,
  );
  const path = ITEM_PREFIX + keyHash + ".json";
  const existing = await readPrivateJson<ProductAlertRecord>(path);
  const now = new Date().toISOString();
  const effectivePrice = currentPrice(product);
  const record: ProductAlertRecord = {
    version: 1,
    id: existing?.id || crypto.randomUUID().replace(/-/g, ""),
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    email,
    emailHash,
    ...(session ? { accountId: session.account.id } : {}),
    kinds,
    sentKinds: [],
    baselinePrice: effectivePrice,
    baselineStock: product.availableStock ?? 0,
    lastSeenPrice: effectivePrice,
    lastSeenStock: product.availableStock ?? 0,
    unsubscribeToken: existing?.unsubscribeToken || randomToken(),
    status: "active",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await Promise.all([
    writePrivateJson(path, record),
    writePrivateJson(
      UNSUB_PREFIX + record.unsubscribeToken + ".json",
      { version: 1, alertPath: path },
    ),
  ]);
  return record;
}

export async function cancelProductAlertByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) return false;
  const marker = await readPrivateJson<{ alertPath?: string }>(
    UNSUB_PREFIX + token + ".json",
  );
  if (!marker?.alertPath?.startsWith(ITEM_PREFIX)) return false;
  const record = await readPrivateJson<ProductAlertRecord>(marker.alertPath);
  if (!record) return false;
  const now = new Date().toISOString();
  await writePrivateJson(marker.alertPath, {
    ...record,
    status: "cancelled",
    cancelledAt: now,
    updatedAt: now,
  } satisfies ProductAlertRecord);
  return true;
}

function alertEmail(
  record: ProductAlertRecord,
  product: Product,
  triggered: ProductAlertKind[],
) {
  const stock = triggered.includes("back-in-stock");
  const price = triggered.includes("price-drop");
  const title =
    stock && price
      ? record.productName + " is back and the price dropped"
      : stock
        ? record.productName + " is back in stock"
        : record.productName + " has a lower price";
  const effectivePrice = currentPrice(product);
  const detail =
    stock && price
      ? "It is available again, and its current price is now lower than when you created the alert."
      : stock
        ? "It is available again. Live stock is limited and can change before checkout."
        : "Its current price is lower than when you created the alert.";
  const unsubscribe =
    siteConfig.url +
    "/api/product-alerts/unsubscribe?token=" +
    encodeURIComponent(record.unsubscribeToken);

  return {
    subject: title,
    html: brandedEmailShell({
      eyebrow: "Product alert",
      title,
      copy:
        detail +
        " Current website price: BDT " +
        Math.round(effectivePrice).toLocaleString("en-BD") +
        ".",
      ctaLabel: "View product",
      ctaHref: "/product/" + product.slug,
      footer:
        "Live price and stock are rechecked on the website. Stop this alert: " +
        unsubscribe,
    }),
    text:
      title +
      "\n\n" +
      detail +
      "\nCurrent website price: BDT " +
      Math.round(effectivePrice).toLocaleString("en-BD") +
      "\n" +
      siteConfig.url +
      "/product/" +
      product.slug +
      "\n\nStop this alert: " +
      unsubscribe,
  };
}

export async function sendDueProductAlerts(limit = 100) {
  if (!productAlertsReadiness().enabled) {
    return {
      enabled: false,
      checked: 0,
      sent: 0,
      failed: 0,
      reason: "ALERTS_NOT_READY",
    };
  }

  const catalogResult = await fetchCrmCatalog();
  if (!catalogResult.ok) {
    return {
      enabled: true,
      checked: 0,
      sent: 0,
      failed: 1,
      reason: "CATALOG_UNAVAILABLE",
    };
  }

  const byId = new Map(
    mergeLiveCatalog(catalogResult.body.products).map((product) => [
      product.id,
      product,
    ]),
  );
  const rows = (await listProductAlerts())
    .filter((row) => row.status === "active")
    .slice(0, Math.min(Math.max(limit, 1), 250));

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const product = byId.get(row.productId);
    if (!product) continue;
    const effectivePrice = currentPrice(product);
    const stock = product.availableStock ?? 0;
    const triggered = productAlertTriggers({
      kinds: row.kinds,
      baselinePrice: row.baselinePrice,
      baselineStock: row.baselineStock,
      currentPrice: effectivePrice,
      currentStock: stock,
    });

    if (!triggered.length) {
      await writePrivateJson(
        ITEM_PREFIX +
          (await sha256("aloyri-alert-key-v1:" + row.emailHash + ":" + row.productId)) +
          ".json",
        {
          ...row,
          lastSeenPrice: effectivePrice,
          lastSeenStock: stock,
          updatedAt: new Date().toISOString(),
        } satisfies ProductAlertRecord,
      );
      continue;
    }

    const email = alertEmail(row, product, triggered);
    const result = await sendTransactionalEmail({
      to: row.email,
      ...email,
    });
    if (!result.ok) {
      failed += 1;
      continue;
    }

    const remaining = row.kinds.filter(
      (kind) => !triggered.includes(kind),
    );
    const now = new Date().toISOString();
    const path =
      ITEM_PREFIX +
      (await sha256("aloyri-alert-key-v1:" + row.emailHash + ":" + row.productId)) +
      ".json";
    await writePrivateJson(path, {
      ...row,
      kinds: remaining,
      sentKinds: [...new Set([...row.sentKinds, ...triggered])],
      status: remaining.length ? "active" : "sent",
      sentAt: now,
      lastSeenPrice: effectivePrice,
      lastSeenStock: stock,
      updatedAt: now,
    } satisfies ProductAlertRecord);
    sent += 1;
  }

  return { enabled: true, checked: rows.length, sent, failed };
}
