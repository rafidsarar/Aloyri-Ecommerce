import "server-only";

import {
  listStructuredJson,
  readStructuredJson,
  writeStructuredJson,
} from "@/lib/structured-record-store";

export type CrmSyncKind = "catalog" | "order";
export type CrmSyncState = "healthy" | "retrying" | "failed";

export type CrmSyncEvent = {
  version: 1;
  id: string;
  kind: CrmSyncKind;
  state: CrmSyncState;
  createdAt: string;
  operation: string;
  reference?: string;
  attempt?: number;
  status?: number;
  code?: string;
  detail: string;
};

export type CrmCatalogSnapshot = {
  version: 1;
  checkedAt: string;
  productCount: number;
  fingerprint: string;
  generatedAt: string;
};

const EVENT_PREFIX = "integrations/crm-sync/events/";
const CATALOG_SNAPSHOT = "integrations/crm-sync/catalog-latest.json";

function clean(value: string | undefined, max = 160) {
  return (value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export async function recordCrmSyncEvent(input: Omit<CrmSyncEvent, "version" | "id" | "createdAt">) {
  const event: CrmSyncEvent = {
    version: 1,
    id: crypto.randomUUID().replace(/-/g, ""),
    createdAt: new Date().toISOString(),
    ...input,
    reference: clean(input.reference, 100) || undefined,
    code: clean(input.code, 80) || undefined,
    detail: clean(input.detail, 240),
  };
  const pathname =
    EVENT_PREFIX +
    event.createdAt.replace(/[:.]/g, "-") +
    "-" +
    event.id +
    ".json";
  await writeStructuredJson(pathname, event);
  return event;
}

export async function saveCrmCatalogSnapshot(snapshot: Omit<CrmCatalogSnapshot, "version">) {
  const value: CrmCatalogSnapshot = { version: 1, ...snapshot };
  await writeStructuredJson(CATALOG_SNAPSHOT, value);
  return value;
}

export async function readCrmCatalogSnapshot() {
  return readStructuredJson<CrmCatalogSnapshot>(CATALOG_SNAPSHOT);
}

export async function crmSyncSummary() {
  const events = (await listStructuredJson<CrmSyncEvent>(EVENT_PREFIX, 200))
    .map((row) => row.value)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = events.filter((event) => Date.parse(event.createdAt) >= since);
  const failed = recent.filter((event) => event.state === "failed");
  const retrying = recent.filter((event) => event.state === "retrying");
  const catalog = await readCrmCatalogSnapshot();
  return {
    recentEvents: recent.length,
    failed24h: failed.length,
    retries24h: retrying.length,
    lastFailure: failed[0] || null,
    catalog,
  };
}
