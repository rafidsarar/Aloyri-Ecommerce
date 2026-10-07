import "server-only";

const gatewayUrl = () => process.env.SUPABASE_MEDIA_GATEWAY_URL || "";
const anonJwt = () => process.env.SUPABASE_MEDIA_ANON_JWT || "";
const oidcToken = () => process.env.VERCEL_OIDC_TOKEN || "";

export function independentMediaStorageConfigured() {
  return Boolean(gatewayUrl() && anonJwt() && oidcToken());
}

function gatewayHeaders() {
  const jwt = anonJwt();
  const oidc = oidcToken();
  if (!jwt || !oidc) {
    throw new Error("Independent media storage authentication is not configured.");
  }
  return {
    Authorization: "Bearer " + jwt,
    "x-vercel-oidc-idp-token": oidc,
  };
}

export async function uploadIndependentMedia(pathname: string, file: File) {
  const url = gatewayUrl();
  if (!url) throw new Error("Independent media storage is not configured.");
  const form = new FormData();
  form.set("path", pathname);
  form.set("file", file);
  const response = await fetch(url + "/upload", {
    method: "POST",
    headers: gatewayHeaders(),
    body: form,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Media upload failed (" + response.status + ").");
  }
}

export async function listIndependentMedia() {
  const url = gatewayUrl();
  if (!url) return [];
  const response = await fetch(url + "/list", {
    headers: gatewayHeaders(),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const result = (await response.json()) as {
    objects?: Array<{ pathname: string; size: number; uploadedAt?: string }>;
  };
  return Array.isArray(result.objects) ? result.objects : [];
}

export async function readIndependentMedia(pathname: string) {
  const url = gatewayUrl();
  if (!url) return null;
  const response = await fetch(
    url + "/object?path=" + encodeURIComponent(pathname),
    { headers: gatewayHeaders(), cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Media read failed (" + response.status + ").");
  return {
    stream: response.body,
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
