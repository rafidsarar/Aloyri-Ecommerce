import "server-only";

import { list } from "@vercel/blob";
import { buildAnalyticsReport } from "@/lib/analytics-store";
import {
  listAdminAccounts,
  type PublicAdminAccount,
} from "@/lib/admin-auth";
import { fetchCrmCatalog } from "@/lib/crm-catalog-integration";
import {
  getPublishingStatus,
  listAdminAuditEvents,
  readPrivateJson,
  readPublishedStorefrontConfig,
  saveDraftStorefrontConfig,
  storefrontStoragePath,
  writeAdminAuditEvent,
  writePrivateJson,
  type StorefrontConfig,
} from "@/lib/storefront-admin-store";

export type HealthState = "healthy" | "warning" | "error";

export type OperationalHealthCheck = {
  id: string;
  label: string;
  state: HealthState;
  detail: string;
};

export type OperationalHealthSnapshot = {
  version: 1;
  id: string;
  checkedAt: string;
  checkedBy: string;
  overall: HealthState;
  commitSha: string | null;
  environment: string;
  checks: OperationalHealthCheck[];
};

export type AdminBackupRecord = {
  version: 1;
  id: string;
  createdAt: string;
  createdBy: string;
  note: string;
  commitSha: string | null;
  published: StorefrontConfig;
  draft: StorefrontConfig;
  staffAccess: PublicAdminAccount[];
};

const HEALTH_PREFIX = "admin/operations/health/";
const BACKUP_PREFIX = "admin/backups/";

function safeId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function logicalPath(pathname: string) {
  const prefix = process.env.VERCEL_ENV === "production" ? "" : "preview/";
  return prefix && pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : pathname;
}

function deliveryRate(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function runOperationalHealth(
  actor = "system",
  persist = false,
): Promise<OperationalHealthSnapshot> {
  const checks: OperationalHealthCheck[] = [];

  const [catalog, staffResult, publishingResult, analyticsResult, auditResult] =
    await Promise.allSettled([
      fetchCrmCatalog(),
      listAdminAccounts(),
      getPublishingStatus(),
      buildAnalyticsReport(1),
      listAdminAuditEvents(50),
    ]);

  if (catalog.status === "fulfilled" && catalog.value.ok) {
    checks.push({
      id: "crm-catalog",
      label: "CRM catalog connection",
      state: "healthy",
      detail:
        catalog.value.body.products.length +
        " customer-safe products returned from CRM.",
    });
  } else {
    const detail =
      catalog.status === "fulfilled"
        ? catalog.value.body.error || "CRM catalog health request failed."
        : "CRM catalog health request failed.";
    checks.push({
      id: "crm-catalog",
      label: "CRM catalog connection",
      state: "error",
      detail,
    });
  }

  const insideDhaka = deliveryRate(process.env.ALOYRI_DELIVERY_DHAKA_BDT);
  const outsideDhaka = deliveryRate(
    process.env.ALOYRI_DELIVERY_OUTSIDE_DHAKA_BDT,
  );
  const bridgeConfigured = Boolean(
    process.env.CRM_INTEGRATION_URL &&
      process.env.CRM_INTEGRATION_ID &&
      process.env.CRM_INTEGRATION_SECRET,
  );
  const orderingEnabled = process.env.ALOYRI_ORDERING_ENABLED === "1";
  const orderingReady =
    bridgeConfigured &&
    orderingEnabled &&
    insideDhaka !== null &&
    outsideDhaka !== null;
  checks.push({
    id: "order-bridge",
    label: "CRM order bridge",
    state: orderingReady ? "healthy" : "error",
    detail: orderingReady
      ? "Signed CRM handoff configured · COD · Dhaka " +
        insideDhaka +
        " BDT · Outside Dhaka " +
        outsideDhaka +
        " BDT."
      : "Ordering integration or delivery-rate configuration is incomplete.",
  });

  if (publishingResult.status === "fulfilled") {
    checks.push({
      id: "storefront-datastore",
      label: "Private storefront datastore",
      state: "healthy",
      detail:
        "Published + Draft readable · " +
        (publishingResult.value.hasDraftChanges
          ? "unpublished changes pending."
          : "draft matches live."),
    });
  } else {
    checks.push({
      id: "storefront-datastore",
      label: "Private storefront datastore",
      state: "error",
      detail: "Published/Draft configuration could not be read.",
    });
  }

  if (analyticsResult.status === "fulfilled") {
    checks.push({
      id: "analytics-store",
      label: "Analytics datastore",
      state: "healthy",
      detail:
        analyticsResult.value.summary.sessions +
        " anonymous sessions visible in the last day.",
    });
  } else {
    checks.push({
      id: "analytics-store",
      label: "Analytics datastore",
      state: "warning",
      detail: "Analytics reporting store could not be read.",
    });
  }

  if (staffResult.status === "fulfilled") {
    const active = staffResult.value.filter((account) => account.active).length;
    checks.push({
      id: "staff-directory",
      label: "Admin staff directory",
      state: "healthy",
      detail:
        active +
        " active account" +
        (active === 1 ? "" : "s") +
        " · " +
        staffResult.value.length +
        " total.",
    });
  } else {
    checks.push({
      id: "staff-directory",
      label: "Admin staff directory",
      state: "error",
      detail: "Staff access configuration could not be read.",
    });
  }

  const recentAudit =
    auditResult.status === "fulfilled" ? auditResult.value : [];
  const recentFailures = recentAudit.filter(
    (event) =>
      /failed|error|unavailable/i.test(event.action) ||
      /failed|error|unavailable/i.test(event.detail || ""),
  ).length;
  checks.push({
    id: "application-incidents",
    label: "Recent application health signals",
    state: recentFailures ? "warning" : "healthy",
    detail: recentFailures
      ? recentFailures +
        " recent audit event(s) contain failure/unavailable signals."
      : "No failure/unavailable signals in the latest private audit events.",
  });

  const environment = process.env.VERCEL_ENV || "development";
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || null;
  checks.push({
    id: "runtime",
    label: "Current runtime",
    state: environment === "production" ? "healthy" : "warning",
    detail:
      environment +
      (commitSha ? " · commit " + commitSha.slice(0, 12) : " · commit unknown"),
  });

  const overall: HealthState = checks.some((check) => check.state === "error")
    ? "error"
    : checks.some((check) => check.state === "warning")
      ? "warning"
      : "healthy";
  const snapshot: OperationalHealthSnapshot = {
    version: 1,
    id: safeId(),
    checkedAt: new Date().toISOString(),
    checkedBy: actor,
    overall,
    commitSha,
    environment,
    checks,
  };

  if (persist) {
    const pathname =
      HEALTH_PREFIX +
      snapshot.checkedAt.replace(/[:.]/g, "-") +
      "-" +
      snapshot.id +
      ".json";
    await writePrivateJson(pathname, snapshot);
    await writeAdminAuditEvent(
      actor,
      "operations.health_check_run",
      overall + " · " + checks.length + " checks",
      { scope: "operations", target: snapshot.id },
    );
  }

  return snapshot;
}

export async function listOperationalHealthSnapshots(limit = 20) {
  const result = await list({
    prefix: storefrontStoragePath(HEALTH_PREFIX),
    limit: Math.min(Math.max(limit, 1), 100),
  });
  const rows = await Promise.all(
    result.blobs.map((blob) =>
      readPrivateJson<OperationalHealthSnapshot>(logicalPath(blob.pathname)),
    ),
  );
  return rows
    .filter((row): row is OperationalHealthSnapshot => Boolean(row))
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
    .slice(0, limit);
}

export async function createAdminBackup(actor: string, note: string) {
  const [published, publishing, staffAccess] = await Promise.all([
    readPublishedStorefrontConfig(),
    getPublishingStatus(),
    listAdminAccounts(),
  ]);
  const record: AdminBackupRecord = {
    version: 1,
    id: safeId(),
    createdAt: new Date().toISOString(),
    createdBy: actor,
    note: note.trim().slice(0, 300) || "Manual Ecommerce Admin backup.",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    published,
    draft: publishing.draft,
    staffAccess,
  };
  const pathname =
    BACKUP_PREFIX +
    record.createdAt.replace(/[:.]/g, "-") +
    "-" +
    record.id +
    ".json";
  await writePrivateJson(pathname, record);
  await writeAdminAuditEvent(
    actor,
    "backup.created",
    record.note,
    { scope: "backup", target: record.id },
  );
  return record;
}

export async function listAdminBackups(limit = 30) {
  const result = await list({
    prefix: storefrontStoragePath(BACKUP_PREFIX),
    limit: Math.min(Math.max(limit, 1), 100),
  });
  const rows = await Promise.all(
    result.blobs.map((blob) =>
      readPrivateJson<AdminBackupRecord>(logicalPath(blob.pathname)),
    ),
  );
  return rows
    .filter((row): row is AdminBackupRecord => Boolean(row))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getAdminBackup(id: string) {
  const rows = await listAdminBackups(100);
  return rows.find((row) => row.id === id) || null;
}

export async function restoreBackupToDraft(actor: string, id: string) {
  const backup = await getAdminBackup(id);
  if (!backup) throw new Error("Backup was not found.");
  await saveDraftStorefrontConfig(backup.draft);
  await writeAdminAuditEvent(
    actor,
    "backup.restored_to_draft",
    backup.note,
    { scope: "backup", target: backup.id },
  );
  return backup;
}
