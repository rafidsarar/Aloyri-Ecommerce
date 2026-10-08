import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

const restoreScope = new AsyncLocalStorage<boolean>();
const recordVersions = new AsyncLocalStorage<Map<string, number | null>>();
class RecordConflict extends Error {}
export async function withRecordRetry<T>(operation: () => Promise<T>): Promise<T> {
  if (recordVersions.getStore()) return operation();
  for (let attempt = 0; attempt < 8; attempt++) {
    try { return await recordVersions.run(new Map(), operation); }
    catch (error) { if (!(error instanceof RecordConflict) || attempt === 7) throw error; }
  }
  throw new RecordConflict("RECORD_CONFLICT");
}


import { neon } from "@neondatabase/serverless";
import { getMediaObject, putMediaObject } from "@/lib/media-storage";
import {
  classifyLegacyRecoveryObject,
  collectReferencedMedia,
  emptyRecoveryClassification,
  logicalRecoveryPath,
  type RecoveryClassificationSummary,
} from "@/lib/legacy-recovery-classifier";

const RECOVERY_BASELINE_COUNT = 849;
const RECOVERY_BASELINE_BYTES = 427831;

type RecordNamespace = "production" | "preview" | "development";

type MigrationState =
  | "not-started"
  | "blocked"
  | "partial"
  | "verified";

export type DatastoreMigrationStatus = {
  id: string;
  state: MigrationState;
  checkedAt: string;
  expectedObjects: number;
  expectedBytes: number;
  listedObjects: number;
  listedBytes: number;
  jsonObjects: number;
  importedObjects: number;
  existingObjects: number;
  skippedObjects: number;
  failedObjects: number;
  detail: string;
  classification: RecoveryClassificationSummary;
};

export type DatastoreHealth = {
  databaseConfigured: boolean;
  databaseReachable: boolean;
  namespace: RecordNamespace;
  recordCount: number;
  migration: DatastoreMigrationStatus | null;
};

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function structuredDatastoreConfigured() {
  return Boolean(databaseUrl());
}

export function legacyBlobConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL,
  );
}

export function currentRecordNamespace(): RecordNamespace {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "development";
}

function blobNamespacePath(
  pathname: string,
  namespace: RecordNamespace = currentRecordNamespace(),
) {
  return namespace === "production" ? pathname : "preview/" + pathname;
}


function sqlClient() {
  const url = databaseUrl();
  if (!url) return null;
  return neon(url);
}

let schemaPromise: Promise<void> | null = null;

async function ensureSchema() {
  const sql = sqlClient();
  if (!sql) throw new Error("Ecommerce database is not configured.");
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS ecommerce_records (
          namespace TEXT NOT NULL,
          pathname TEXT NOT NULL,
          payload JSONB NOT NULL,
          source TEXT NOT NULL DEFAULT 'app',
          imported_from_blob BOOLEAN NOT NULL DEFAULT FALSE,
          source_size BIGINT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (namespace, pathname)
        )
      `;
      await sql`CREATE TABLE IF NOT EXISTS ecommerce_leases (namespace TEXT NOT NULL, key TEXT NOT NULL, token TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(namespace, key))`;
      await sql`CREATE TABLE IF NOT EXISTS ecommerce_rate_limits (namespace TEXT NOT NULL, key TEXT NOT NULL, count INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(namespace, key))`;
      await sql`ALTER TABLE ecommerce_records ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1`;
      await sql`
        CREATE INDEX IF NOT EXISTS ecommerce_records_namespace_path_idx
        ON ecommerce_records (namespace, pathname)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS ecommerce_migration_runs (
          id TEXT PRIMARY KEY,
          state TEXT NOT NULL,
          checked_at TIMESTAMPTZ NOT NULL,
          expected_objects INTEGER NOT NULL,
          expected_bytes BIGINT NOT NULL,
          listed_objects INTEGER NOT NULL,
          listed_bytes BIGINT NOT NULL,
          json_objects INTEGER NOT NULL,
          imported_objects INTEGER NOT NULL,
          existing_objects INTEGER NOT NULL,
          skipped_objects INTEGER NOT NULL,
          failed_objects INTEGER NOT NULL,
          detail TEXT NOT NULL,
          classification JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `;
      await sql`
        ALTER TABLE ecommerce_migration_runs
        ADD COLUMN IF NOT EXISTS classification JSONB NOT NULL DEFAULT '{}'::jsonb
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

async function readDatabaseJson<T>(
  pathname: string,
  namespace = currentRecordNamespace(),
): Promise<T | null> {
  if (!structuredDatastoreConfigured()) return null;
  await ensureSchema();
  const sql = sqlClient()!;
  const rows = await sql`
    SELECT payload, revision
    FROM ecommerce_records
    WHERE namespace = ${namespace} AND pathname = ${pathname}
    LIMIT 1
  `;
  recordVersions.getStore()?.set(namespace + ":" + pathname, rows.length ? Number(rows[0].revision) : null);
  return rows.length ? (rows[0].payload as T) : null;
}

async function writeDatabaseJson(
  pathname: string,
  value: unknown,
  options: {
    namespace?: RecordNamespace;
    source?: string;
    importedFromBlob?: boolean;
    sourceSize?: number;
  } = {},
) {
  if (process.env.ALOYRI_MAINTENANCE_ENABLED === "1" && !restoreScope.getStore()) throw new Error("MAINTENANCE_MODE");
  await ensureSchema();
  const sql = sqlClient()!;
  const namespace = options.namespace || currentRecordNamespace();
  const payload = JSON.stringify(value);
  const versions = recordVersions.getStore();
  const key = namespace + ":" + pathname;
  if (versions?.has(key)) {
    const revision = versions.get(key);
    if (revision === null) {
      const inserted = await insertDatabaseJsonOnce(pathname, value, options);
      if (!inserted) throw new RecordConflict("RECORD_CONFLICT");
      versions.set(key, 1);
      return;
    }
    const rows = await sql`UPDATE ecommerce_records SET payload = ${payload}::jsonb, revision = revision + 1, updated_at = NOW() WHERE namespace = ${namespace} AND pathname = ${pathname} AND revision = ${revision} RETURNING revision`;
    if (!rows.length) throw new RecordConflict("RECORD_CONFLICT");
    versions.set(key, Number(rows[0].revision));
    return;
  }
  await sql`
    INSERT INTO ecommerce_records (
      namespace,
      pathname,
      payload,
      source,
      imported_from_blob,
      source_size,
      created_at,
      updated_at
    )
    VALUES (
      ${namespace},
      ${pathname},
      ${payload}::jsonb,
      ${options.source || "app"},
      ${Boolean(options.importedFromBlob)},
      ${options.sourceSize ?? null},
      NOW(),
      NOW()
    )
    ON CONFLICT (namespace, pathname)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      revision = ecommerce_records.revision + 1,
      source = EXCLUDED.source,
      imported_from_blob = EXCLUDED.imported_from_blob,
      source_size = EXCLUDED.source_size,
      updated_at = NOW()
  `;
}

async function insertDatabaseJsonOnce(
  pathname: string,
  value: unknown,
  options: {
    namespace?: RecordNamespace;
    source?: string;
    importedFromBlob?: boolean;
    sourceSize?: number;
  } = {},
) {
  if (process.env.ALOYRI_MAINTENANCE_ENABLED === "1" && !restoreScope.getStore()) throw new Error("MAINTENANCE_MODE");
  await ensureSchema();
  const sql = sqlClient()!;
  const namespace = options.namespace || currentRecordNamespace();
  const payload = JSON.stringify(value);
  const rows = await sql`
    INSERT INTO ecommerce_records (
      namespace,
      pathname,
      payload,
      source,
      imported_from_blob,
      source_size,
      created_at,
      updated_at
    )
    VALUES (
      ${namespace},
      ${pathname},
      ${payload}::jsonb,
      ${options.source || "app"},
      ${Boolean(options.importedFromBlob)},
      ${options.sourceSize ?? null},
      NOW(),
      NOW()
    )
    ON CONFLICT (namespace, pathname) DO NOTHING
    RETURNING pathname
  `;
  return rows.length > 0;
}

async function readLegacyBlobJson<T>(pathname: string): Promise<T | null> {
  if (
    !legacyBlobConfigured() ||
    process.env.ALOYRI_LEGACY_BLOB_FALLBACK !== "1"
  ) {
    return null;
  }
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(blobNamespacePath(pathname), {
      access: "private",
      useCache: false,
    });
    if (!result) return null;
    const value = JSON.parse(await new Response(result.stream).text()) as T;
    if (structuredDatastoreConfigured()) {
      await insertDatabaseJsonOnce(pathname, value, {
        source: "legacy-read",
        importedFromBlob: true,
        sourceSize: result.blob.size ?? undefined,
      });
    }
    return value;
  } catch {
    return null;
  }
}

export async function readStructuredJson<T>(pathname: string): Promise<T | null> {
  const stored = await readDatabaseJson<T>(pathname);
  if (stored !== null) return stored;
  return readLegacyBlobJson<T>(pathname);
}

export async function writeStructuredJson(pathname: string, value: unknown) {
  if (!structuredDatastoreConfigured()) {
    throw new Error("Ecommerce structured datastore is not configured.");
  }
  await writeDatabaseJson(pathname, value);
}

export async function createStructuredJsonOnce(
  pathname: string,
  value: unknown,
) {
  if (!structuredDatastoreConfigured()) {
    throw new Error("Ecommerce structured datastore is not configured.");
  }
  return insertDatabaseJsonOnce(pathname, value);
}

export async function listStructuredJson<T>(
  prefix: string,
  limit = 1000,
  offset = 0,
): Promise<Array<{ pathname: string; value: T }>> {
  if (!structuredDatastoreConfigured()) return [];
  await ensureSchema();
  const sql = sqlClient()!;
  const namespace = currentRecordNamespace();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 10_000);
  const safeOffset = Math.max(0, Math.trunc(offset));
  const pattern = prefix + "%";
  const rows = await sql`
    SELECT pathname, payload
    FROM ecommerce_records
    WHERE namespace = ${namespace} AND pathname LIKE ${pattern}
    ORDER BY pathname DESC
    LIMIT ${safeLimit}
    OFFSET ${safeOffset}
  `;
  return rows.map((row) => ({
    pathname: String(row.pathname),
    value: row.payload as T,
  }));
}

export async function countStructuredRecords(
  namespace = currentRecordNamespace(),
) {
  if (!structuredDatastoreConfigured()) return 0;
  await ensureSchema();
  const sql = sqlClient()!;
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM ecommerce_records
    WHERE namespace = ${namespace}
  `;
  return Number(rows[0]?.count || 0);
}

async function writeMigrationStatus(status: DatastoreMigrationStatus) {
  await ensureSchema();
  const sql = sqlClient()!;
  await sql`
    INSERT INTO ecommerce_migration_runs (
      id,
      state,
      checked_at,
      expected_objects,
      expected_bytes,
      listed_objects,
      listed_bytes,
      json_objects,
      imported_objects,
      existing_objects,
      skipped_objects,
      failed_objects,
      detail,
      classification
    )
    VALUES (
      ${status.id},
      ${status.state},
      ${status.checkedAt},
      ${status.expectedObjects},
      ${status.expectedBytes},
      ${status.listedObjects},
      ${status.listedBytes},
      ${status.jsonObjects},
      ${status.importedObjects},
      ${status.existingObjects},
      ${status.skippedObjects},
      ${status.failedObjects},
      ${status.detail},
      ${JSON.stringify(status.classification)}::jsonb
    )
    ON CONFLICT (id)
    DO UPDATE SET
      state = EXCLUDED.state,
      checked_at = EXCLUDED.checked_at,
      listed_objects = EXCLUDED.listed_objects,
      listed_bytes = EXCLUDED.listed_bytes,
      json_objects = EXCLUDED.json_objects,
      imported_objects = EXCLUDED.imported_objects,
      existing_objects = EXCLUDED.existing_objects,
      skipped_objects = EXCLUDED.skipped_objects,
      failed_objects = EXCLUDED.failed_objects,
      detail = EXCLUDED.detail,
      classification = EXCLUDED.classification
  `;
}

export async function getLegacyMigrationStatus() {
  if (!structuredDatastoreConfigured()) return null;
  await ensureSchema();
  const sql = sqlClient()!;
  const rows = await sql`
    SELECT
      id,
      state,
      checked_at,
      expected_objects,
      expected_bytes,
      listed_objects,
      listed_bytes,
      json_objects,
      imported_objects,
      existing_objects,
      skipped_objects,
      failed_objects,
      detail,
      classification
    FROM ecommerce_migration_runs
    WHERE id IN ('selective-recovery-v2', 'blob-recovery-v1')
    ORDER BY checked_at DESC
    LIMIT 1
  `;
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: String(row.id),
    state: row.state as MigrationState,
    checkedAt: new Date(row.checked_at as string | Date).toISOString(),
    expectedObjects: Number(row.expected_objects),
    expectedBytes: Number(row.expected_bytes),
    listedObjects: Number(row.listed_objects),
    listedBytes: Number(row.listed_bytes),
    jsonObjects: Number(row.json_objects),
    importedObjects: Number(row.imported_objects),
    existingObjects: Number(row.existing_objects),
    skippedObjects: Number(row.skipped_objects),
    failedObjects: Number(row.failed_objects),
    detail: String(row.detail),
    classification:
      row.classification && typeof row.classification === "object"
        ? (row.classification as RecoveryClassificationSummary)
        : emptyRecoveryClassification(),
  } satisfies DatastoreMigrationStatus;
}

export async function structuredDatastoreHealth(): Promise<DatastoreHealth> {
  if (!structuredDatastoreConfigured()) {
    return {
      databaseConfigured: false,
      databaseReachable: false,
      namespace: currentRecordNamespace(),
      recordCount: 0,
      migration: null,
    };
  }
  try {
    const [recordCount, migration] = await Promise.all([
      countStructuredRecords(),
      getLegacyMigrationStatus(),
    ]);
    return {
      databaseConfigured: true,
      databaseReachable: true,
      namespace: currentRecordNamespace(),
      recordCount,
      migration,
    };
  } catch {
    return {
      databaseConfigured: true,
      databaseReachable: false,
      namespace: currentRecordNamespace(),
      recordCount: 0,
      migration: null,
    };
  }
}

export async function migrateLegacyBlobRecords() {
  const checkedAt = new Date().toISOString();
  const base = {
    id: "selective-recovery-v2",
    checkedAt,
    expectedObjects: RECOVERY_BASELINE_COUNT,
    expectedBytes: RECOVERY_BASELINE_BYTES,
    listedObjects: 0,
    listedBytes: 0,
    jsonObjects: 0,
    importedObjects: 0,
    existingObjects: 0,
    skippedObjects: 0,
    failedObjects: 0,
    classification: emptyRecoveryClassification(),
  };

  if (!structuredDatastoreConfigured()) {
    return {
      ...base,
      state: "blocked" as const,
      detail: "Neon database is not configured.",
    };
  }

  if (!legacyBlobConfigured()) {
    const status: DatastoreMigrationStatus = {
      ...base,
      state: "blocked",
      detail: "Legacy Blob credentials are unavailable.",
    };
    await writeMigrationStatus(status);
    return status;
  }

  const [publishedConfig, draftConfig] = await Promise.all([
    readDatabaseJson<unknown>("admin/storefront-config.json", "production"),
    readDatabaseJson<unknown>("admin/storefront-draft.json", "production"),
  ]);
  const publishedMedia = collectReferencedMedia(publishedConfig);
  const draftMedia = collectReferencedMedia(draftConfig);

  const blobs: Array<{
    pathname: string;
    size: number;
  }> = [];
  let cursor: string | undefined;

  let legacyGet: typeof import("@vercel/blob").get;
  let legacyList: typeof import("@vercel/blob").list;
  try {
    const legacy = await import("@vercel/blob");
    legacyGet = legacy.get;
    legacyList = legacy.list;
    do {
      const page = await legacyList({
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      blobs.push(
        ...page.blobs.map((blob) => ({
          pathname: blob.pathname,
          size: blob.size,
        })),
      );
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor && blobs.length < 10_000);
  } catch (error) {
    const status: DatastoreMigrationStatus = {
      ...base,
      state: "blocked",
      detail:
        "Legacy Blob listing is unavailable: " +
        (error instanceof Error ? error.message.slice(0, 220) : "unknown error"),
    };
    await writeMigrationStatus(status);
    return status;
  }

  const listedBytes = blobs.reduce((sum, blob) => sum + blob.size, 0);
  const baselineMatches =
    blobs.length === RECOVERY_BASELINE_COUNT &&
    listedBytes === RECOVERY_BASELINE_BYTES;

  const classified = blobs.map((blob) => ({
    ...blob,
    recoveryClass: classifyLegacyRecoveryObject(
      blob.pathname,
      publishedMedia,
      draftMedia,
    ),
  }));

  const classification = emptyRecoveryClassification();
  classification.baselineMatches = baselineMatches;
  classification.authoritative.listed = classified.filter(
    (blob) => blob.recoveryClass === "authoritative",
  ).length;
  classification.usefulHistory.listed = classified.filter(
    (blob) => blob.recoveryClass === "useful-history",
  ).length;
  classification.disposable.listed = classified.filter(
    (blob) => blob.recoveryClass === "disposable",
  ).length;
  classification.review.listed = classified.filter(
    (blob) => blob.recoveryClass === "review",
  ).length;
  classification.referencedMedia.required = publishedMedia.size;

  const recoverableJson = classified.filter(
    (blob) =>
      blob.pathname.endsWith(".json") &&
      (blob.recoveryClass === "authoritative" ||
        blob.recoveryClass === "useful-history"),
  );

  for (let index = 0; index < recoverableJson.length; index += 20) {
    const batch = recoverableJson.slice(index, index + 20);
    const results = await Promise.all(
      batch.map(async (blob) => {
        try {
          const result = await legacyGet(blob.pathname, {
            access: "private",
            useCache: false,
          });
          if (!result) return { blob, result: "failed" as const };
          const value = JSON.parse(await new Response(result.stream).text());
          const logical = logicalRecoveryPath(blob.pathname);
          const inserted = await insertDatabaseJsonOnce(
            logical.pathname,
            value,
            {
              namespace: logical.namespace,
              source: "selective-recovery-v2",
              importedFromBlob: true,
              sourceSize: blob.size,
            },
          );
          return {
            blob,
            result: inserted ? ("imported" as const) : ("existing" as const),
          };
        } catch {
          return { blob, result: "failed" as const };
        }
      }),
    );

    for (const outcome of results) {
      const target =
        outcome.blob.recoveryClass === "authoritative"
          ? classification.authoritative
          : classification.usefulHistory;
      if (outcome.result === "imported") target.imported += 1;
      if (outcome.result === "existing") target.existing += 1;
      if (outcome.result === "failed") target.failed += 1;
    }
  }

  const productionBlobByLogicalPath = new Map(
    classified
      .map((blob) => ({
        blob,
        logical: logicalRecoveryPath(blob.pathname),
      }))
      .filter((item) => item.logical.namespace === "production")
      .map((item) => [item.logical.pathname, item.blob] as const),
  );

  function mediaType(pathname: string) {
    const lower = pathname.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    return "";
  }

  for (const pathname of publishedMedia) {
    try {
      const existing = await getMediaObject(pathname);
      if (existing) {
        try {
          await existing.stream?.cancel();
        } catch {
          // The existence check is sufficient even if the response stream cannot be cancelled.
        }
        classification.referencedMedia.existing += 1;
        continue;
      }

      const blob = productionBlobByLogicalPath.get(pathname);
      if (!blob) {
        classification.referencedMedia.failed += 1;
        continue;
      }

      const result = await legacyGet(blob.pathname, {
        access: "private",
        useCache: false,
      });
      if (!result) {
        classification.referencedMedia.failed += 1;
        continue;
      }

      const contentType = result.blob.contentType || mediaType(pathname);
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
        classification.referencedMedia.failed += 1;
        continue;
      }

      const bytes = await new Response(result.stream).arrayBuffer();
      const filename = pathname.split("/").pop() || "recovered-media";
      await putMediaObject(
        pathname,
        new File([bytes], filename, { type: contentType }),
      );
      classification.referencedMedia.copied += 1;
    } catch {
      classification.referencedMedia.failed += 1;
    }
  }

  const authoritativeAccounted =
    classification.authoritative.imported +
      classification.authoritative.existing ===
      classification.authoritative.listed &&
    classification.authoritative.failed === 0;
  const referencedMediaAccounted =
    classification.referencedMedia.existing +
      classification.referencedMedia.copied ===
      classification.referencedMedia.required &&
    classification.referencedMedia.failed === 0;

  const state: MigrationState =
    authoritativeAccounted && referencedMediaAccounted && baselineMatches && !cursor && classification.review.listed === 0
      ? "verified"
      : "partial";

  const importedObjects =
    classification.authoritative.imported +
    classification.usefulHistory.imported;
  const existingObjects =
    classification.authoritative.existing +
    classification.usefulHistory.existing;
  const failedObjects =
    classification.authoritative.failed +
    classification.usefulHistory.failed +
    classification.referencedMedia.failed;
  const jsonObjects = classified.filter((blob) =>
    blob.pathname.endsWith(".json"),
  ).length;
  const referencedBlobCount = classified.filter(
    (blob) => blob.recoveryClass === "referenced-media",
  ).length;
  const skippedObjects = Math.max(
    0,
    blobs.length - recoverableJson.length - referencedBlobCount,
  );

  const status: DatastoreMigrationStatus = {
    ...base,
    state,
    listedObjects: blobs.length,
    listedBytes,
    jsonObjects,
    importedObjects,
    existingObjects,
    skippedObjects,
    failedObjects,
    classification,
    detail:
      state === "verified"
        ? "Selective recovery verified: every listed authoritative record is present in Neon and every media asset referenced by the live storefront is present in independent object storage. The complete legacy inventory matches its baseline and has no unclassified records."
        : "Selective recovery is incomplete: at least one authoritative record or live-referenced media asset still requires recovery. Useful history and disposable artifacts do not block operation.",
  };

  await writeMigrationStatus(status);
  return status;
}

export async function acquireRecordLease(key: string, ttlSeconds = 120) {
  await ensureSchema(); const sql = sqlClient()!; const namespace = currentRecordNamespace(); const token = crypto.randomUUID();
  const rows = await sql`INSERT INTO ecommerce_leases(namespace,key,token,expires_at) VALUES(${namespace},${key},${token},NOW()+${ttlSeconds}*INTERVAL '1 second') ON CONFLICT(namespace,key) DO UPDATE SET token=EXCLUDED.token, expires_at=EXCLUDED.expires_at WHERE ecommerce_leases.expires_at < NOW() RETURNING token`;
  return rows.length ? token : null;
}
export async function releaseRecordLease(key: string, token: string) {
  const sql=sqlClient()!; await sql`DELETE FROM ecommerce_leases WHERE namespace=${currentRecordNamespace()} AND key=${key} AND token=${token}`;
}
export async function sharedRateAllowed(key: string, limit: number, windowMs: number) {
  await ensureSchema(); const sql=sqlClient()!; const namespace=currentRecordNamespace();
  const rows=await sql`INSERT INTO ecommerce_rate_limits(namespace,key,count,reset_at) VALUES(${namespace},${key},1,NOW()+${windowMs}*INTERVAL '1 millisecond') ON CONFLICT(namespace,key) DO UPDATE SET count=CASE WHEN ecommerce_rate_limits.reset_at<=NOW() THEN 1 ELSE ecommerce_rate_limits.count+1 END, reset_at=CASE WHEN ecommerce_rate_limits.reset_at<=NOW() THEN EXCLUDED.reset_at ELSE ecommerce_rate_limits.reset_at END RETURNING count`;
  return Number(rows[0].count)<=limit;
}
export async function cleanupOperationalMetadata() {
  if (!structuredDatastoreConfigured()) return;
  await ensureSchema(); const sql=sqlClient()!;
  await sql`DELETE FROM ecommerce_rate_limits WHERE reset_at < NOW() - INTERVAL '1 day'`;
  await sql`DELETE FROM ecommerce_leases WHERE expires_at < NOW() - INTERVAL '1 day'`;
  // Transient OAuth cart handoffs have no customer PII. Expire them separately;
  // do not ever include them in business backups or durable customer records.
  await sql`DELETE FROM ecommerce_records WHERE pathname LIKE 'customer-auth/cart-handoff/%' AND updated_at < NOW() - INTERVAL '1 day'`;
}

export type OperationalSnapshot = { version: 1; namespace: RecordNamespace; createdAt: string; records: Array<{ pathname: string; payload: unknown }>; sha256: string };
async function snapshotHash(records: OperationalSnapshot["records"]) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(JSON.stringify(records)).digest("hex");
}
export async function createOperationalSnapshot(): Promise<OperationalSnapshot> {
  await ensureSchema(); const sql=sqlClient()!; const namespace=currentRecordNamespace();
  // One statement supplies a consistent database snapshot; archives are excluded to avoid recursive growth.
  const rows=await sql`SELECT pathname,payload FROM ecommerce_records WHERE namespace=${namespace} AND pathname NOT LIKE 'admin/operational-backups/%' AND pathname NOT LIKE 'customer-auth/sessions/%' AND pathname NOT LIKE 'customer-auth/magic%' AND pathname NOT LIKE 'customer-auth/cart-handoff/%' ORDER BY pathname`;
  const records=rows.map(row=>({pathname:String(row.pathname),payload:row.payload}));
  return {version:1,namespace,createdAt:new Date().toISOString(),records,sha256:await snapshotHash(records)};
}
export async function validateOperationalSnapshot(value: unknown): Promise<OperationalSnapshot> {
  if(!value||typeof value!=="object") throw new Error("INVALID_BACKUP");
  const input=value as OperationalSnapshot;
  if(input.version!==1 || !["production","preview","development"].includes(input.namespace) || !Array.isArray(input.records) || input.records.length>100000 || !/^[a-f0-9]{64}$/.test(input.sha256))throw new Error("INVALID_BACKUP");
  const paths=new Set<string>();
  for(const row of input.records){if(!row || typeof row.pathname!=="string" || row.pathname.length>500 || row.pathname.includes("..") || !/^[A-Za-z0-9._:/-]+$/.test(row.pathname) || row.payload===undefined || paths.has(row.pathname))throw new Error("INVALID_BACKUP_RECORD");paths.add(row.pathname);}
  if(await snapshotHash(input.records)!==input.sha256)throw new Error("BACKUP_CHECKSUM_MISMATCH");
  return input;
}
export async function restoreOperationalSnapshot(value: unknown) {
  if (currentRecordNamespace() === "production" && process.env.ALOYRI_MAINTENANCE_ENABLED !== "1") throw new Error("RESTORE_REQUIRES_MAINTENANCE");
  const snapshot=await validateOperationalSnapshot(value);
  if(snapshot.namespace!==currentRecordNamespace())throw new Error("BACKUP_NAMESPACE_MISMATCH");
  const token=await acquireRecordLease("operational-restore",300); if(!token)throw new Error("RESTORE_BUSY");
  try {
    const rollback=await createOperationalSnapshot();
    await restoreScope.run(true, () => writeDatabaseJson("admin/operational-backups/"+crypto.randomUUID()+".json",rollback));
    const sql=sqlClient()!; const namespace=currentRecordNamespace();
    await sql.transaction([
      sql`DELETE FROM ecommerce_records WHERE namespace=${namespace} AND pathname NOT LIKE 'admin/operational-backups/%'`,
      sql`INSERT INTO ecommerce_records(namespace,pathname,payload,revision) SELECT ${namespace}, row.pathname, row.payload, 1 FROM jsonb_to_recordset(${JSON.stringify(snapshot.records)}::jsonb) AS row(pathname TEXT,payload JSONB)`,
    ]);
    return {restored:snapshot.records.length,rollbackSha256:rollback.sha256};
  } finally {await releaseRecordLease("operational-restore",token);}
}
