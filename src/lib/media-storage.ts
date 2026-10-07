import "server-only";

export type MediaObject = {
  pathname: string;
  size: number;
  uploadedAt?: string;
};

function gateway() {
  const url = process.env.SUPABASE_MEDIA_GATEWAY_URL || "";
  const oidc = process.env.VERCEL_OIDC_TOKEN || "";
  return { url, oidc };
}

export function mediaStorageConfigured() {
  const { url, oidc } = gateway();
  return Boolean(url && oidc);
}

function headers(extra: HeadersInit = {}) {
  const { oidc } = gateway();
  return {
    "x-vercel-oidc-idp-token": oidc,
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
  });
  if (!response.ok) {
    throw new Error("Media upload failed (" + response.status + ").");
  }
}

export async function listMediaObjects(prefix: string): Promise<MediaObject[]> {
  const { url } = gateway();
  if (!mediaStorageConfigured()) return [];

  const response = await fetch(url + "/list", {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Media listing failed (" + response.status + ").");
  }

  const payload = (await response.json()) as {
    objects?: Array<{
      pathname?: string;
      size?: number;
      uploadedAt?: string;
    }>;
  };

  return (payload.objects || [])
    .filter(
      (value): value is {
        pathname: string;
        size?: number;
        uploadedAt?: string;
      } =>
        typeof value.pathname === "string" &&
        value.pathname.startsWith(prefix),
    )
    .map((value) => ({
      pathname: value.pathname,
      size: Number(value.size || 0),
      uploadedAt: value.uploadedAt,
    }));
}

export async function getMediaObject(pathname: string) {
  const { url } = gateway();
  if (!mediaStorageConfigured()) return null;

  const response = await fetch(
    url + "/object?path=" + encodeURIComponent(pathname),
    {
      headers: headers(),
      cache: "no-store",
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

export async function deleteMediaObject(pathname: string) {
  const { url } = gateway();
  if (!mediaStorageConfigured()) {
    throw new Error("Independent media storage is not configured.");
  }

  const response = await fetch(
    url + "/object?path=" + encodeURIComponent(pathname),
    {
      method: "DELETE",
      headers: headers(),
      cache: "no-store",
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Media delete failed (" + response.status + ").");
  }
}
