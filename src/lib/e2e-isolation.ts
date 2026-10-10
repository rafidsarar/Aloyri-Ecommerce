/** Defense in depth: certification previews must never call live external services. */
export function e2eExternalEndpointAllowed(
  configuredUrl: string | undefined,
  permittedOrigin: string | undefined,
  e2eMode: string | undefined,
): boolean {
  if (e2eMode !== "1") return true;
  if (!configuredUrl || !permittedOrigin) return false;
  try {
    const candidate = new URL(configuredUrl);
    const permitted = new URL(permittedOrigin);
    if (candidate.protocol !== "https:" || permitted.protocol !== "https:") return false;
    if (candidate.username || candidate.password || permitted.username || permitted.password) return false;
    if (candidate.origin !== permitted.origin || permitted.pathname !== "/" || permitted.search || permitted.hash) return false;
    if (!candidate.hostname.includes("e2e") || candidate.hostname.endsWith(".invalid")) return false;
    return true;
  } catch {
    return false;
  }
}

export function e2eCrmEndpointAllowed(url: string | undefined): boolean {
  return e2eExternalEndpointAllowed(url, process.env.ALOYRI_E2E_CRM_ORIGIN, process.env.ALOYRI_E2E_MODE);
}

export function e2eMediaEndpointAllowed(url: string | undefined): boolean {
  if (process.env.ALOYRI_E2E_MODE !== "1") return true;
  const allowedOrigin = process.env.ALOYRI_E2E_MEDIA_ORIGIN;
  if (!url || !allowedOrigin) return false;
  try {
    const candidate = new URL(url);
    const approved = new URL(allowedOrigin);
    // Supabase Edge Functions have shared project hosts, so pin the exact
    // isolated gateway path as well as the HTTPS origin. Production media
    // gateways on the same host must never be accepted.
    return candidate.protocol === "https:"
      && approved.protocol === "https:"
      && !candidate.username && !candidate.password
      && candidate.origin === approved.origin
      && approved.pathname === "/" && !approved.search && !approved.hash
      && candidate.pathname === "/functions/v1/aloyri-e2e-media-gateway"
      && !candidate.search && !candidate.hash
      && candidate.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
