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

function gatewayUploadEndpoint() {
  const { url } = gateway();
  // Supabase Edge Functions route the invocation at /functions/v1/<slug>.
  // Use the function's action query rather than appending a subpath that
  // some gateways reject with HTTP 405.
  const endpoint = new URL(url);
  endpoint.searchParams.set("action", "upload");
  return endpoint.toString();
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
  if (!mediaStorageConfigured()) {
    throw new Error("Independent media storage is not configured.");
  }

  // The gateway's action=upload handler accepts raw image bytes and
  // x-object-path. Multipart FormData is supported only on /upload, which
  // Supabase's Edge Function router may reject before reaching the handler.
  const response = await fetch(gatewayUploadEndpoint(), {
    method: "POST",
    headers: headers({
      "x-object-path": pathname,
      "content-type": file.type,
    }),
    body: new Uint8Array(await file.arrayBuffer()),
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

  const endpoint = new URL(url);
  endpoint.searchParams.set("path", pathname);
  const response = await fetch(
    endpoint.toString(),
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
