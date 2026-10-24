/**
 * Where an Owner should return when a direct-save conflict is detected.
 * The old visual builder is deliberately not part of this workflow.
 */
export function ownerSaveConflictDestination({
  scope,
  action,
  target,
}: {
  scope?: string;
  action?: string;
  target?: string;
}) {
  const safeTarget = target && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(target)
    ? encodeURIComponent(target)
    : null;
  switch (scope) {
    case "homepage":
      return "/admin/homepage";
    case "settings":
      return "/admin/settings";
    case "products":
      return safeTarget ? `/admin/products/${safeTarget}` : "/admin/products";
    case "pages":
      return target && ["about", "shipping", "returns", "contact", "privacy", "terms", "faq"].includes(target)
        ? `/admin/pages/${target}`
        : "/admin/pages";
    case "merchandising":
      if (action === "merchandising.discovery_updated") return "/admin/merchandising/discovery";
      if (action === "merchandising.recommendations_updated") return "/admin/merchandising/recommendations";
      if (action === "merchandising.product_rules_updated") return "/admin/merchandising/products";
      if (action === "merchandising.homepage_updated") return "/admin/merchandising/homepage";
      return "/admin/merchandising";
    case "seo":
      return "/admin/seo";
    default:
      return "/admin";
  }
}
