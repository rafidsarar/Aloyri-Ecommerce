import "server-only";

type SupabaseUser = {
  id?: unknown;
  email?: unknown;
  email_confirmed_at?: unknown;
  app_metadata?: unknown;
  user_metadata?: unknown;
};

export const GOOGLE_PKCE_COOKIE = "aloyri_google_pkce";
export const GOOGLE_NEXT_COOKIE = "aloyri_google_next";

function config() {
  return {
    url: (process.env.SUPABASE_AUTH_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_AUTH_PUBLISHABLE_KEY || "",
    enabled: process.env.ALOYRI_GOOGLE_AUTH_ENABLED === "1",
  };
}

export function googleAuthReady() {
  const value = config();
  return Boolean(value.enabled && value.url && value.key);
}

export function safeCustomerNextPath(value: string | null | undefined) {
  const path = (value || "/account").trim();
  return path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !/[\r\n]/.test(path) &&
    path.length <= 240
    ? path
    : "/account";
}

export function googlePkceVerifier() {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function googlePkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}

export function googleAuthorizeUrl(input: {
  redirectTo: string;
  challenge: string;
}) {
  const value = config();
  if (!googleAuthReady()) throw new Error("GOOGLE_AUTH_NOT_READY");
  const url = new URL(value.url + "/auth/v1/authorize");
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", input.redirectTo);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "s256");
  return url;
}

function googleProviderVerified(user: SupabaseUser) {
  if (!user.app_metadata || typeof user.app_metadata !== "object") return false;
  const meta = user.app_metadata as Record<string, unknown>;
  if (meta.provider === "google") return true;
  return (
    Array.isArray(meta.providers) &&
    meta.providers.some((provider) => provider === "google")
  );
}

function displayName(user: SupabaseUser) {
  if (!user.user_metadata || typeof user.user_metadata !== "object") return "";
  const meta = user.user_metadata as Record<string, unknown>;
  for (const key of ["full_name", "name"]) {
    if (typeof meta[key] === "string") {
      return meta[key].trim().replace(/\s+/g, " ").slice(0, 80);
    }
  }
  return "";
}

export async function exchangeGoogleAuthCode(
  authCode: string,
  verifier: string,
) {
  const value = config();
  if (!googleAuthReady()) throw new Error("GOOGLE_AUTH_NOT_READY");
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(verifier)) {
    throw new Error("INVALID_PKCE_VERIFIER");
  }
  if (!authCode || authCode.length > 1000) {
    throw new Error("INVALID_AUTH_CODE");
  }

  const tokenResponse = await fetch(
    value.url + "/auth/v1/token?grant_type=pkce",
    {
      method: "POST",
      headers: {
        apikey: value.key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        auth_code: authCode,
        code_verifier: verifier,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!tokenResponse.ok) {
    throw new Error("GOOGLE_CODE_EXCHANGE_FAILED");
  }

  const tokens = (await tokenResponse.json()) as {
    access_token?: unknown;
  };
  if (typeof tokens.access_token !== "string" || !tokens.access_token) {
    throw new Error("GOOGLE_CODE_EXCHANGE_FAILED");
  }

  const userResponse = await fetch(value.url + "/auth/v1/user", {
    headers: {
      apikey: value.key,
      Authorization: "Bearer " + tokens.access_token,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!userResponse.ok) throw new Error("GOOGLE_IDENTITY_UNAVAILABLE");
  const user = (await userResponse.json()) as SupabaseUser;

  if (
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    !user.email ||
    !user.email_confirmed_at ||
    !googleProviderVerified(user)
  ) {
    throw new Error("GOOGLE_IDENTITY_UNVERIFIED");
  }

  void fetch(value.url + "/auth/v1/logout?scope=local", {
    method: "POST",
    headers: {
      apikey: value.key,
      Authorization: "Bearer " + tokens.access_token,
    },
    cache: "no-store",
  }).catch(() => undefined);

  return {
    supabaseUserId: user.id,
    email: user.email.trim().toLowerCase(),
    displayName: displayName(user),
  };
}
