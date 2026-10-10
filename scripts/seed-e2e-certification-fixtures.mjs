/**
 * One-time, idempotent fixtures for the isolated Aloyri certification Preview.
 *
 * This file is part of the temporary E2E branch. It never modifies live data.
 * No fixture credentials or customer session tokens are printed.
 */
import { createHash, createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const intendedBranch = "feature/unified-storefront-control-center-20261010";
const isE2e = process.env.ALOYRI_E2E_MODE === "1";

if (!isE2e) {
  console.log("E2E certification fixtures: skipped outside isolated mode.");
} else {
  const safe =
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === intendedBranch &&
    process.env.ALOYRI_E2E_NEON_PROJECT_ID &&
    process.env.NEON_PROJECT_ID === process.env.ALOYRI_E2E_NEON_PROJECT_ID &&
    process.env.ALOYRI_ORDERING_ENABLED !== "1" &&
    process.env.ALOYRI_CUSTOMER_AUTH_ENABLED !== "1" &&
    process.env.ALOYRI_GOOGLE_AUTH_ENABLED !== "1" &&
    process.env.ALOYRI_LEGACY_BLOB_FALLBACK !== "1" &&
    process.env.CRM_INTEGRATION_URL?.includes("aloyri-crm-e2e-runner-") &&
    process.env.CRM_INTEGRATION_SECRET &&
    process.env.DATABASE_URL?.startsWith("postgres");

  if (!safe) throw new Error("E2E_FIXTURE_ISOLATION_INVARIANT_FAILED");
  const sql = neon(process.env.DATABASE_URL);
  const query = async (statement, params = []) =>
    (await sql.query(statement, params, { fullResults: true })).rows;

  const admin = await query(
    "SELECT pathname FROM ecommerce_records WHERE namespace=$1 AND pathname IN ($2,$3) LIMIT 1",
    ["preview", "admin/accounts.json", "admin/auth.json"],
  );
  if (!admin.length) throw new Error("E2E_TEST_ADMIN_OWNER_NOT_CONFIGURED");

  const workspaces = await query(
    "SELECT data FROM crm_workspaces WHERE owner_id=$1 LIMIT 1",
    ["e2e-owner"],
  );
  if (workspaces.length !== 1) throw new Error("E2E_CRM_OWNER_NOT_CONFIGURED");
  const data = typeof workspaces[0].data === "string"
    ? JSON.parse(workspaces[0].data)
    : workspaces[0].data;
  const product = data?.products?.find((row) => row.id === "simple-wash");
  if (!product?.active || !(Number(product.price) > 0)) {
    throw new Error("E2E_TEST_PRODUCT_MISSING");
  }

  const now = new Date().toISOString();
  const promo = {
    ownerId: "e2e-owner",
    id: "promo-e2e-five-percent-certification",
    code: "E2E5",
    name: "E2E 5% Certification",
  };

  // Insert only a fixed, product-specific 5% test coupon. Never edit other promotions.
  await query(
    "INSERT INTO crm_ecommerce_promotions " +
    "(owner_id,id,name,code,description,kind,value,minimum_subtotal,starts_at,ends_at,usage_limit," +
    "target_type,target_ids_json,free_shipping,badge_text,priority,active,created_at,updated_at) " +
    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) " +
    "ON CONFLICT (owner_id,id) DO NOTHING",
    [
      promo.ownerId, promo.id, promo.name, promo.code,
      "Synthetic certification coupon; only applies to simple-wash.",
      "percentage", 5, 0, null, null, 100,
      "products", JSON.stringify(["simple-wash"]), false, "5% off", 0, true,
      now, now,
    ],
  );
  const promotions = await query(
    "SELECT owner_id,id,code,kind,value,target_type,target_ids_json,active " +
    "FROM crm_ecommerce_promotions WHERE owner_id=$1 AND id=$2",
    [promo.ownerId, promo.id],
  );
  const actual = promotions[0];
  const targets = actual && (typeof actual.target_ids_json === "string"
    ? JSON.parse(actual.target_ids_json) : actual.target_ids_json);
  if (
    !actual || actual.code !== promo.code || actual.kind !== "percentage" ||
    Number(actual.value) !== 5 || actual.target_type !== "products" ||
    !Array.isArray(targets) || targets.length !== 1 ||
    targets[0] !== "simple-wash" || actual.active !== true
  ) {
    throw new Error("E2E_TEST_PROMOTION_VALIDATION_FAILED");
  }

  const email = "e2e-certification-customer@aloyri.test";
  const emailHash = createHash("sha256")
    .update("aloyri-customer-email-v1:" + email).digest("base64url");
  const customerId = createHash("sha256")
    .update("aloyri-ecommerce-test-customer-20261011")
    .digest("hex").slice(0, 32);
  const token = createHmac("sha256", process.env.CRM_INTEGRATION_SECRET)
    .update("isolated-preview-customer-session-20261011")
    .digest("base64url");
  const sessionHash = createHash("sha256").update(token).digest("base64url");
  const accountPath = "customer-auth/accounts/" + customerId + ".json";
  const indexPath = "customer-auth/email/" + emailHash + ".json";
  const sessionPath = "customer-auth/sessions/" + sessionHash + ".json";

  const account = {
    version: 1,
    id: customerId,
    email,
    emailHash,
    displayName: "E2E Certification Customer",
    phone: "01700000000",
    savedProductIds: ["simple-wash"],
    savedAddresses: [{
      id: "e2e-cert-address-20261011",
      label: "Test address",
      recipientName: "E2E Certification Customer",
      phone: "01700000000",
      district: "Dhaka",
      area: "Dhanmondi",
      address: "123 Certification Test Road, Dhaka",
    }],
    orderRefs: [],
    emailPreferences: {
      postDelivery: false,
      reviewRequest: false,
      reorderReminder: false,
    },
    googleIdentity: {
      // Synthetic UUID is never associated with a real OAuth provider.
      supabaseUserId: "15d9dd18-754e-4470-a5f8-18fc0a1bc921",
      linkedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const session = {
    version: 1,
    accountId: customerId,
    createdAt: now,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    method: "google",
  };
  const records = [
    [accountPath, account],
    [indexPath, { version: 1, accountId: customerId }],
    [sessionPath, session],
  ];

  for (const [pathname, payload] of records) {
    const json = JSON.stringify(payload);
    await query(
      "INSERT INTO ecommerce_records (namespace,pathname,payload,source,imported_from_blob) " +
      "VALUES ($1,$2,$3::jsonb,$4,false) " +
      "ON CONFLICT (namespace,pathname) DO NOTHING",
      ["preview", pathname, json, "e2e-certification-fixture"],
    );
  }

  const stored = await query(
    "SELECT pathname,payload FROM ecommerce_records WHERE namespace=$1 " +
    "AND pathname IN ($2,$3,$4)",
    ["preview", accountPath, indexPath, sessionPath],
  );
  if (stored.length !== 3 ||
      stored.find((row) => row.pathname === accountPath)?.payload?.email !== email ||
      stored.find((row) => row.pathname === indexPath)?.payload?.accountId !== customerId ||
      stored.find((row) => row.pathname === sessionPath)?.payload?.accountId !== customerId) {
    throw new Error("E2E_CUSTOMER_FIXTURE_VALIDATION_FAILED");
  }

  console.log("E2E certification fixtures ready:", {
    promotion: promo.code,
    promotionPercent: 5,
    productId: "simple-wash",
    customer: email,
    accountAndSessionRecords: stored.length,
    namespace: "preview",
  });
}
