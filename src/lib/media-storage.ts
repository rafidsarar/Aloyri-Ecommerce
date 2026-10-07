import "server-only";

export type MediaObject = {
  pathname: string;
  size: number;
  uploadedAt?: string;
};

function gateway() {
  const url = process.env.SUPABASE_MEDIA_GATEWAY_URL || "";
  const key = process.env.SUPABASE_MEDIA_GATEWAY_KEY || "";
  const oidc = process.env.VERCEL_OIDC_TOKEN || "";
  return { url, key, oidc };
}

export function mediaStorageConfigured() {
  const { url, key, oidc } = gateway();
  return Boolean(url && (key || oidc));
}

function headers(extra: HeadersInit = {}) {
  const { key, oidc } = gateway();
  return {
    ...(key ? { "x-aloyri-storage-key": key } : {}),
    ...(oidc ? { "x-vercel-oidc-idp-token": oidc } : {}),
    ...extra,
  };
}

export async function putMediaObject(pathname: string, file: File) {
  const { url } = gateway();
  if (!mediaStorageConfigured()) {
    throw new Error("Independent media storage is not configured.");
  }

  const form = new FormData();
  form.set("path", pathname);
  form.set("file", file);

  const response = await fetch(url + "/upload", {
    method: "POST",
    headers: headers(),
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error("Media upload failed (" + response.status + ").");
  }
}

export async function listMediaObjects(prefix: string): Promise<MediaObject[]> {
  const { url } = gateway(); if (!mediaStorageConfigured()) return [];
  const objects = new Map<string, MediaObject>(); const seen = new Set<string>(); let cursor = "";
  for (let page = 0; page < 100; page++) {
    const response = await fetch(url + "/list?prefix=" + encodeURIComponent(prefix) + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""), { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("Media listing failed (" + response.status + ").");
    const payload = await response.json() as { objects?: MediaObject[]; cursor?: string; nextCursor?: string; hasMore?: boolean };
    for (const item of payload.objects || []) if (typeof item.pathname === "string" && item.pathname.startsWith(prefix)) objects.set(item.pathname, { ...item, size: Number(item.size || 0) });
    const next = payload.nextCursor || (payload.hasMore ? payload.cursor : "");
    if (!next) { if (payload.hasMore) throw new Error("MEDIA_PAGINATION_INCOMPLETE"); return [...objects.values()]; }
    if (seen.has(next)) throw new Error("MEDIA_CURSOR_REPEATED"); seen.add(next); cursor = next;
  }
  throw new Error("MEDIA_PAGINATION_LIMIT");
}

export async function getMediaObject(pathname: string) {
  const { url } = gateway();
  if (!mediaStorageConfigured()) return null;

  const response = await fetch(
    url + "/object?path=" + encodeURIComponent(pathname),
    {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok || !response.body) {
    throw new Error("Media read failed (" + response.status + ").");
  }
  return {
    stream: response.body,
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
