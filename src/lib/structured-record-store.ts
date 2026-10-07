import "server-only";

import { get, list, put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";

const RECORD_TABLE = "ecommerce_records";
const MIGRATION_TABLE = "ecommerce_migration_runs";
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

function logicalBlobPath(pathname: string) {
  if (pathname.startsWith("preview/")) {
    return {
      namespace: "preview" as const,
      pathname: pathname.slice("preview/".length),
    };
  }
  return { namespace: "production" as const, pathname };
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
          detail TEXT NOT NULL
        )
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
    SELECT payload
    FROM ecommerce_records
    WHERE namespace = ${namespace} AND pathname = ${pathname}
    LIMIT 1
  `;
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
  await ensureSchema();
  const sql = sqlClient()!;
  const namespace = options.namespace || currentRecordNamespace();
  const payload = JSON.stringify(value);
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
        sourceSize: result.blob.size,
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
  if (structuredDatastoreConfigured()) {
    await writeDatabaseJson(pathname, value);
    return;
  }
  if (!legacyBlobConfigured()) {
    throw new Error("Website datastore is not configured.");
  }
  await put(blobNamespacePath(pathname), JSON.stringify(value, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function createStructuredJsonOnce(
  pathname: string,
  value: unknown,
) {
  if (structuredDatastoreConfigured()) {
    return insertDatabaseJsonOnce(pathname, value);
  }
  if (!legacyBlobConfigured()) {
    throw new Error("Website datastore is not configured.");
  }
  try {
    await put(blobNamespacePath(pathname), JSON.stringify(value, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists|overwrite|conflict|409/i.test(message)) return false;
    throw error;
  }
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
      detail
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
      ${status.detail}
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
      detail = EXCLUDED.detail
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
      detail
    FROM ecommerce_migration_runs
    WHERE id = 'blob-recovery-v1'
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
    id: "blob-recovery-v1",
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

  let blobs: Array<{
    pathname: string;
    size: number;
  }> = [];
  let cursor: string | undefined;

  try {
    do {
      const page = await list({
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
        "Legacy Blob listing is still unavailable: " +
        (error instanceof Error ? error.message.slice(0, 220) : "unknown error"),
    };
    await writeMigrationStatus(status);
    return status;
  }

  const jsonBlobs = blobs.filter((blob) => blob.pathname.endsWith(".json"));
  let importedObjects = 0;
  let existingObjects = 0;
  let failedObjects = 0;

  for (let index = 0; index < jsonBlobs.length; index += 20) {
    const batch = jsonBlobs.slice(index, index + 20);
    const results = await Promise.all(
      batch.map(async (blob) => {
        try {
          const result = await get(blob.pathname, {
            access: "private",
            useCache: false,
          });
          if (!result) return "failed" as const;
          const value = JSON.parse(await new Response(result.stream).text());
          const logical = logicalBlobPath(blob.pathname);
          const inserted = await insertDatabaseJsonOnce(
            logical.pathname,
            value,
            {
              namespace: logical.namespace,
              source: "blob-recovery-v1",
              importedFromBlob: true,
              sourceSize: blob.size,
            },
          );
          return inserted ? ("imported" as const) : ("existing" as const);
        } catch {
          return "failed" as const;
        }
      }),
    );
    importedObjects += results.filter((result) => result === "imported").length;
    existingObjects += results.filter((result) => result === "existing").length;
    failedObjects += results.filter((result) => result === "failed").length;
  }

  const listedBytes = blobs.reduce((sum, blob) => sum + blob.size, 0);
  const skippedObjects = blobs.length - jsonBlobs.length;
  const baselineMatches =
    blobs.length === RECOVERY_BASELINE_COUNT &&
    listedBytes === RECOVERY_BASELINE_BYTES;
  const allJsonAccountedFor =
    importedObjects + existingObjects === jsonBlobs.length &&
    failedObjects === 0;
  const state: MigrationState =
    baselineMatches && allJsonAccountedFor ? "verified" : "partial";

  const status: DatastoreMigrationStatus = {
    ...base,
    state,
    listedObjects: blobs.length,
    listedBytes,
    jsonObjects: jsonBlobs.length,
    importedObjects,
    existingObjects,
    skippedObjects,
    failedObjects,
    detail:
      state === "verified"
        ? "All 849 recovery-baseline Blob objects were enumerated without deletion; every JSON record is present in Neon and non-JSON objects remain preserved in Blob."
        : "Migration completed partially. No Blob objects were deleted or overwritten; review counts before certification.",
  };
  await writeMigrationStatus(status);
  return status;
}
