import "server-only";

export type MediaObject = {
  pathname: string;
  size: number;
  uploadedAt?: string;
};

function gateway() {
  const url = process.env.SUPABASE_MEDIA_GATEWAY_URL || "";
  const key = process.env.SUPABASE_MEDIA_GATEWAY_KEY || "";
  return { url, key };
}

export function mediaStorageConfigured() {
  const { url, key } = gateway();
  return Boolean(url && key);
}

function headers(extra: HeadersInit = {}) {
  const { key } = gateway();
  return {
    "x-aloyri-storage-key": key,
    ...extra,
  };
}

export async function putMediaObject(pathname: string, file: File) {
  const { url } = gateway();
  if (!mediaStorageConfigured()) throw new Error("Independent media storage is not configured.");
  const response = await fetch(url + "?action=upload", {
    method: "POST",
    headers: headers({
      "x-object-path": pathname,
      "content-type": file.type || "application/octet-stream",
    }),
    body: file,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Media upload failed (" + response.status + ").");
}

export async function listMediaObjects(prefix: string): Promise<MediaObject[]> {
  const { url } = gateway();
  if (!mediaStorageConfigured()) return [];
  const response = await fetch(url + "?action=list&prefix=" + encodeURIComponent(prefix), {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Media listing failed (" + response.status + ").");
  const values = await response.json() as Array<{
    name?: string;
    metadata?: { size?: number };
    updated_at?: string;
    created_at?: string;
  }>;
  return values
    .filter((value) => typeof value.name === "string")
    .map((value) => ({
      pathname: prefix + value.name!,
      size: Number(value.metadata?.size || 0),
      uploadedAt: value.updated_at || value.created_at,
    }));
}

export async function getMediaObject(pathname: string) {
  const { url } = gateway();
  if (!mediaStorageConfigured()) return null;
  const response = await fetch(url + "?path=" + encodeURIComponent(pathname), {
    headers: headers(),
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok || !response.body) {
    throw new Error("Media read failed (" + response.status + ").");
  }
  return {
    stream: response.body,
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
