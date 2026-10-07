import { sharedRateAllowed, structuredDatastoreConfigured } from "@/lib/structured-record-store";
import { createHash } from "node:crypto";
type RateEntry = { count: number; resetAt: number };

const globalRate = globalThis as typeof globalThis & {
  __aloyriPublicRate?: Map<string, RateEntry>;
};

const rateStore =
  globalRate.__aloyriPublicRate ??
  (globalRate.__aloyriPublicRate = new Map<string, RateEntry>());

export function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function rateAllowed(
  namespace: string,
  key: string,
  limit: number,
  windowMs: number,
) {
  if (structuredDatastoreConfigured()) {
    try { return await sharedRateAllowed(namespace + ":" + createHash("sha256").update(key).digest("hex"), limit, windowMs); }
    catch { return false; }
  }
  if (process.env.VERCEL_ENV === "production") return false;
  const now = Date.now();

  if (rateStore.size > 4000) {
    for (const [entryKey, entry] of rateStore) {
      if (entry.resetAt <= now) rateStore.delete(entryKey);
    }
  }

  const storageKey = namespace + ":" + key;
  const current = rateStore.get(storageKey);

  if (!current || current.resetAt <= now) {
    rateStore.set(storageKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) return false;

  current.count += 1;
  return true;
}
