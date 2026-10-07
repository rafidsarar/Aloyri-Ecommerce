export type RecoveryClass =
  | "authoritative"
  | "referenced-media"
  | "useful-history"
  | "disposable"
  | "review";

export type RecoveryClassificationSummary = {
  baselineMatches: boolean;
  authoritative: {
    listed: number;
    imported: number;
    existing: number;
    failed: number;
  };
  referencedMedia: {
    required: number;
    existing: number;
    copied: number;
    failed: number;
  };
  usefulHistory: {
    listed: number;
    imported: number;
    existing: number;
    failed: number;
  };
  disposable: {
    listed: number;
  };
  review: {
    listed: number;
  };
};

export function emptyRecoveryClassification(): RecoveryClassificationSummary {
  return {
    baselineMatches: false,
    authoritative: { listed: 0, imported: 0, existing: 0, failed: 0 },
    referencedMedia: { required: 0, existing: 0, copied: 0, failed: 0 },
    usefulHistory: { listed: 0, imported: 0, existing: 0, failed: 0 },
    disposable: { listed: 0 },
    review: { listed: 0 },
  };
}

const AUTHORITATIVE_EXACT = new Set([
  "admin/accounts.json",
  "admin/auth.json",
  "admin/storefront-config.json",
]);

const AUTHORITATIVE_PREFIXES = [
  "payments/settlements/",
  "delivery/shipments/",
  "customer-auth/accounts/",
  "customer-auth/email/",
  "support/cases/",
];

const USEFUL_EXACT = new Set([
  "admin/storefront-draft.json",
]);

const USEFUL_PREFIXES = [
  "admin/history/",
  "admin/audit/",
  "analytics/",
  "reviews/items/",
];

const DISPOSABLE_PREFIXES = [
  "customer-auth/magic/",
  "customer-auth/magic-claims/",
  "customer-auth/sessions/",
  "cart-recovery/",
  "product-alerts/",
  "lifecycle-queue/",
  "admin/runtime-errors/",
  "admin/operations/health/",
  "admin/backups/",
  "reviews/helpful/",
  "reviews/metrics/",
];

export function logicalRecoveryPath(pathname: string) {
  if (pathname.startsWith("preview/")) {
    return {
      namespace: "preview" as const,
      pathname: pathname.slice("preview/".length),
    };
  }
  return { namespace: "production" as const, pathname };
}

export function collectReferencedMedia(value: unknown): Set<string> {
  const found = new Set<string>();
  const visit = (current: unknown) => {
    if (typeof current === "string") {
      if (
        current.startsWith("media/") &&
        !current.includes("..") &&
        /^[A-Za-z0-9._/-]+$/.test(current)
      ) {
        found.add(current);
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current && typeof current === "object") {
      Object.values(current as Record<string, unknown>).forEach(visit);
    }
  };
  visit(value);
  return found;
}

export function classifyLegacyRecoveryObject(
  blobPathname: string,
  publishedMedia: ReadonlySet<string>,
  draftMedia: ReadonlySet<string>,
): RecoveryClass {
  const logical = logicalRecoveryPath(blobPathname);

  if (logical.namespace !== "production") return "disposable";

  if (publishedMedia.has(logical.pathname)) return "referenced-media";

  if (
    AUTHORITATIVE_EXACT.has(logical.pathname) ||
    AUTHORITATIVE_PREFIXES.some((prefix) => logical.pathname.startsWith(prefix))
  ) {
    return "authoritative";
  }

  if (
    USEFUL_EXACT.has(logical.pathname) ||
    USEFUL_PREFIXES.some((prefix) => logical.pathname.startsWith(prefix)) ||
    draftMedia.has(logical.pathname)
  ) {
    return "useful-history";
  }

  if (
    DISPOSABLE_PREFIXES.some((prefix) => logical.pathname.startsWith(prefix))
  ) {
    return "disposable";
  }

  if (logical.pathname.startsWith("media/")) return "useful-history";

  return "review";
}
