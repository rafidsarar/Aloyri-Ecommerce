import type { CSSProperties } from "react";

export function normalizeHeroBackground(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toLowerCase() : "";
}

export function heroBackgroundStyle(value: unknown): CSSProperties | undefined {
  const color = normalizeHeroBackground(value);
  if (!color) return undefined;
  const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  return { "--hero-background": color, "--hero-foreground": luminance > .179 ? "#000000" : "#ffffff" } as CSSProperties;
}
