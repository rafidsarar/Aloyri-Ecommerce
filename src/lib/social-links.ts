export type SocialLinks = {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  x: string;
  linkedin: string;
  whatsapp: string;
};

export const socialPlatforms: (keyof SocialLinks)[] = ["facebook", "instagram", "tiktok", "youtube", "x", "linkedin", "whatsapp"];

export const defaultSocialLinks: SocialLinks = {
  facebook: "", instagram: "", tiktok: "", youtube: "", x: "", linkedin: "", whatsapp: "",
};

const socialDomains: Record<keyof SocialLinks, string[]> = {
  facebook: ["facebook.com", "fb.com", "fb.me"],
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
  whatsapp: ["wa.me", "whatsapp.com"],
};

export function validSocialUrl(platform: keyof SocialLinks, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > 300) return "";
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    if (!socialDomains[platform].some(domain => host === domain || host.endsWith("." + domain))) return "";
    return url.toString();
  } catch {
    return "";
  }
}
