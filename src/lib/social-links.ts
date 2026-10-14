export const socialPlatformOptions = [
  { key: "instagram", label: "Instagram", field: "socialInstagram", example: "https://www.instagram.com/yourbrand" },
  { key: "facebook", label: "Facebook", field: "socialFacebook", example: "https://www.facebook.com/yourbrand" },
  { key: "x", label: "X", field: "socialX", example: "https://x.com/yourbrand" },
  { key: "linkedin", label: "LinkedIn", field: "socialLinkedin", example: "https://www.linkedin.com/company/yourbrand" },
] as const;

export type SocialPlatform = (typeof socialPlatformOptions)[number]["key"];
export type SocialLinks = Record<SocialPlatform, string>;

export const emptySocialLinks: SocialLinks = {
  instagram: "",
  facebook: "",
  x: "",
  linkedin: "",
};

const allowedDomains: Record<SocialPlatform, readonly string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "m.facebook.com"],
  x: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
};

/** External social URLs must use HTTPS and lead to the expected network. */
export function normalizeSocialUrl(value: unknown, platform: SocialPlatform): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 300) return "";
  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    if (!allowedDomains[platform].some(domain =>
      hostname === domain || hostname === `www.${domain}`)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function normalizeSocialLinks(value: unknown): SocialLinks {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    instagram: normalizeSocialUrl(source.instagram, "instagram"),
    facebook: normalizeSocialUrl(source.facebook, "facebook"),
    x: normalizeSocialUrl(source.x, "x"),
    linkedin: normalizeSocialUrl(source.linkedin, "linkedin"),
  };
}
