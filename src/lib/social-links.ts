/** Validated official social profile URLs for admin settings and the public footer. */
export const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"] },
  { key: "instagram", label: "Instagram", hosts: ["instagram.com", "instagr.am"] },
  { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { key: "x", label: "X", hosts: ["x.com", "twitter.com"] },
  { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"] },
  { key: "whatsapp", label: "WhatsApp", hosts: ["wa.me", "whatsapp.com"] },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["key"];
export type SocialLinks = Record<SocialPlatform, string>;

export function safeSocialUrl(platform: SocialPlatform, input: unknown): string | null {
  if (typeof input !== "string" || input.length > 400) return null;
  const value = input.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const definition = SOCIAL_PLATFORMS.find(item => item.key === platform);
    const hostname = url.hostname.toLowerCase();
    if (!definition?.hosts.some(host => hostname === host || hostname.endsWith("." + host))) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeSocialLinks(value: unknown): SocialLinks {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const result = {} as SocialLinks;
  for (const platform of SOCIAL_PLATFORMS) {
    result[platform.key] = safeSocialUrl(platform.key, source[platform.key]) ?? "";
  }
  return result;
}

export function visibleSocialLinks(value: unknown) {
  const links = normalizeSocialLinks(value);
  return SOCIAL_PLATFORMS.flatMap(platform =>
    links[platform.key] ? [{ key: platform.key, label: platform.label, href: links[platform.key] }] : [],
  );
}
