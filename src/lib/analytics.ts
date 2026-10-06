export type StorefrontEventName =
  | "page_view"
  | "product_view"
  | "product_click"
  | "collection_view"
  | "collection_product_click"
  | "campaign_impression"
  | "campaign_click"
  | "merchandising_impression"
  | "merchandising_click"
  | "search"
  | "add_to_cart"
  | "checkout_start"
  | "checkout_review"
  | "order_created"
  | "order_tracking_success"
  | "return_request_submitted"
  | "web_vital";

export type StorefrontEventProperties = {
  productId?: string;
  category?: "Cleanser" | "Moisturizer" | "Sunscreen";
  collectionId?: string;
  campaignId?: string;
  placementId?: string;
  placementKind?: string;
  searchTerm?: string;
  resultCount?: number;
  itemCount?: number;
  deliveryZone?: "inside-dhaka" | "outside-dhaka";
  paymentMethod?: "COD";
  orderStatus?: string;
  reason?: string;
  resolution?: string;
  totalBdt?: number;
  metric?: "LCP" | "CLS" | "INP" | "TTFB";
  metricValue?: number;
};

export type AnalyticsClientContext = {
  visitorId?: string;
  sessionId?: string;
  pagePath?: string;
  device?: "mobile" | "tablet" | "desktop";
  source?: string;
  medium?: string;
  campaign?: string;
  referrerDomain?: string;
  collectionId?: string;
  campaignId?: string;
  placementId?: string;
  placementKind?: string;
  searchTerm?: string;
};

const DISABLED_KEY = "aloyri_analytics_disabled";
const VISITOR_KEY = "aloyri_analytics_visitor";
const SESSION_KEY = "aloyri_analytics_session";
const ATTRIBUTION_KEY = "aloyri_analytics_attribution";
const CONTEXT_KEY = "aloyri_analytics_context";
const SESSION_TTL_MS = 30 * 60 * 1000;

function analyticsAllowed() {
  if (typeof window === "undefined") return false;
  if (window.location.pathname.startsWith("/admin")) return false;
  if (navigator.doNotTrack === "1") return false;
  try {
    return localStorage.getItem(DISABLED_KEY) !== "1";
  } catch {
    return true;
  }
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function safeToken(value: string | null | undefined, max = 80) {
  const normalized = (value || "").trim();
  if (!normalized || normalized.length > max) return undefined;
  return /^[A-Za-z0-9._+-]+$/.test(normalized)
    ? normalized.slice(0, max)
    : undefined;
}

function safeEntityId(value: string | null | undefined) {
  const normalized = (value || "").trim();
  if (!normalized) return undefined;
  return /^[A-Za-z0-9_-]{1,80}$/.test(normalized)
    ? normalized
    : undefined;
}

export function safeSearchTerm(value: string | null | undefined) {
  const normalized = (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 50);
  if (normalized.length < 2) return undefined;
  if (normalized.includes("@")) return undefined;
  if (/\d{6,}/.test(normalized)) return undefined;
  if (!/^[A-Za-z0-9 .&'+_-]+$/.test(normalized)) return undefined;
  return normalized;
}

function currentDevice(): AnalyticsClientContext["device"] {
  if (typeof window === "undefined") return undefined;
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1200) return "tablet";
  return "desktop";
}

function currentPagePath() {
  if (typeof window === "undefined") return undefined;
  const path = window.location.pathname;
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) {
    return undefined;
  }
  return path.slice(0, 240);
}

function externalReferrerDomain() {
  if (typeof document === "undefined" || !document.referrer) return undefined;
  try {
    const url = new URL(document.referrer);
    if (url.hostname === window.location.hostname) return undefined;
    return url.hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return undefined;
  }
}

function ensureVisitorId() {
  if (!analyticsAllowed()) return undefined;
  try {
    let id = localStorage.getItem(VISITOR_KEY) || "";
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

function ensureSessionId() {
  if (!analyticsAllowed()) return undefined;
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: unknown; touchedAt?: unknown };
      if (
        typeof parsed.id === "string" &&
        /^[A-Za-z0-9_-]{16,80}$/.test(parsed.id) &&
        typeof parsed.touchedAt === "number" &&
        now - parsed.touchedAt < SESSION_TTL_MS
      ) {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ id: parsed.id, touchedAt: now }),
        );
        return parsed.id;
      }
    }

    const id = randomId();
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id, touchedAt: now }),
    );
    return id;
  } catch {
    return undefined;
  }
}

function attributionFromLocation() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utmSource = safeToken(params.get("utm_source"));
  const utmMedium = safeToken(params.get("utm_medium"));
  const utmCampaign = safeToken(params.get("utm_campaign"));
  const referrerDomain = externalReferrerDomain();

  if (utmSource || utmMedium || utmCampaign) {
    return {
      source: utmSource || "campaign",
      medium: utmMedium || "referral",
      campaign: utmCampaign,
      referrerDomain,
    };
  }

  if (referrerDomain) {
    const searchSources: Record<string, string> = {
      "google.com": "google",
      "bing.com": "bing",
      "duckduckgo.com": "duckduckgo",
      "yahoo.com": "yahoo",
    };
    const socialSources: Record<string, string> = {
      "facebook.com": "facebook",
      "instagram.com": "instagram",
      "tiktok.com": "tiktok",
      "youtube.com": "youtube",
      "linkedin.com": "linkedin",
      "x.com": "x",
      "twitter.com": "x",
    };
    const searchSource = searchSources[referrerDomain];
    const socialSource = socialSources[referrerDomain];
    if (searchSource) {
      return {
        source: searchSource,
        medium: "organic",
        referrerDomain,
      };
    }
    if (socialSource) {
      return {
        source: socialSource,
        medium: "social",
        referrerDomain,
      };
    }
    return {
      source: referrerDomain,
      medium: "referral",
      referrerDomain,
    };
  }

  return {
    source: "direct",
    medium: "none",
  };
}

function readAttribution() {
  if (typeof window === "undefined") return attributionFromLocation();
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        source:
          typeof parsed.source === "string"
            ? safeToken(parsed.source)
            : undefined,
        medium:
          typeof parsed.medium === "string"
            ? safeToken(parsed.medium)
            : undefined,
        campaign:
          typeof parsed.campaign === "string"
            ? safeToken(parsed.campaign)
            : undefined,
        referrerDomain:
          typeof parsed.referrerDomain === "string"
            ? safeToken(parsed.referrerDomain, 120)
            : undefined,
      };
    }
  } catch {
    // Attribution can fall back to the current landing context.
  }

  const attribution = attributionFromLocation();
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Analytics still works without persistent attribution.
  }
  return attribution;
}

function readMerchandisingContext() {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CONTEXT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      collectionId:
        typeof parsed.collectionId === "string"
          ? safeEntityId(parsed.collectionId)
          : undefined,
      campaignId:
        typeof parsed.campaignId === "string"
          ? safeEntityId(parsed.campaignId)
          : undefined,
      placementId:
        typeof parsed.placementId === "string"
          ? safeEntityId(parsed.placementId)
          : undefined,
      placementKind:
        typeof parsed.placementKind === "string"
          ? safeToken(parsed.placementKind, 40)
          : undefined,
      searchTerm:
        typeof parsed.searchTerm === "string"
          ? safeSearchTerm(parsed.searchTerm)
          : undefined,
    };
  } catch {
    return {};
  }
}

export function rememberAnalyticsContext(
  context: Pick<
    AnalyticsClientContext,
    "collectionId" | "campaignId" | "placementId" | "placementKind" | "searchTerm"
  >,
) {
  if (!analyticsAllowed()) return;
  try {
    const current = readMerchandisingContext();
    const next = {
      ...current,
      ...(context.collectionId
        ? { collectionId: safeEntityId(context.collectionId) }
        : {}),
      ...(context.campaignId
        ? { campaignId: safeEntityId(context.campaignId) }
        : {}),
      ...(context.placementId
        ? { placementId: safeEntityId(context.placementId) }
        : {}),
      ...(context.placementKind
        ? { placementKind: safeToken(context.placementKind, 40) }
        : {}),
      ...(context.searchTerm
        ? { searchTerm: safeSearchTerm(context.searchTerm) }
        : {}),
    };
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(next));
  } catch {
    // Context is optional.
  }
}

export function getAnalyticsContext(): AnalyticsClientContext {
  if (!analyticsAllowed()) return {};
  return {
    visitorId: ensureVisitorId(),
    sessionId: ensureSessionId(),
    pagePath: currentPagePath(),
    device: currentDevice(),
    ...readAttribution(),
    ...readMerchandisingContext(),
  };
}

export function trackStorefrontEvent(
  event: StorefrontEventName,
  properties: StorefrontEventProperties = {},
  contextOverrides: Pick<
    AnalyticsClientContext,
    "collectionId" | "campaignId" | "placementId" | "placementKind" | "searchTerm"
  > = {},
) {
  if (!analyticsAllowed()) return;

  if (
    event === "collection_view" &&
    contextOverrides.collectionId
  ) {
    rememberAnalyticsContext({ collectionId: contextOverrides.collectionId });
  }
  if (
    contextOverrides.campaignId &&
    (event === "campaign_click" ||
      event === "product_click" ||
      event === "collection_product_click")
  ) {
    rememberAnalyticsContext({ campaignId: contextOverrides.campaignId });
  }
  if (
    contextOverrides.collectionId &&
    event === "collection_product_click"
  ) {
    rememberAnalyticsContext({ collectionId: contextOverrides.collectionId });
  }
  if (
    contextOverrides.placementId &&
    (event === "merchandising_click" || event === "campaign_click")
  ) {
    rememberAnalyticsContext({
      placementId: contextOverrides.placementId,
      placementKind: contextOverrides.placementKind,
    });
  }
  if (event === "search" && properties.searchTerm) {
    rememberAnalyticsContext({ searchTerm: properties.searchTerm });
  }

  const context = {
    ...getAnalyticsContext(),
    ...contextOverrides,
  };
  const body = JSON.stringify({ event, properties, context });
  const blob = new Blob([body], { type: "application/json" });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "omit",
  }).catch(() => undefined);
}
