import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FooterSocialLinks } from "../src/components/footer-social-links";
import { normalizeSocialLinks, normalizeSocialUrl } from "../src/lib/social-links";

test("footer social icons render only verified configured profiles", () => {
  const links = normalizeSocialLinks({
    instagram: "https://www.instagram.com/aloyri",
    facebook: "https://www.facebook.com/aloyri",
    x: "",
    linkedin: "",
  });
  const html = renderToStaticMarkup(createElement(FooterSocialLinks, { links }));
  expect(html).toContain('aria-label="Aloyri social media"');
  expect(html).toContain('aria-label="Aloyri on Instagram"');
  expect(html).toContain('aria-label="Aloyri on Facebook"');
  expect(html).not.toContain('Aloyri on X');
  expect(html).not.toContain('Aloyri on LinkedIn');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('target="_blank"');
  expect(renderToStaticMarkup(createElement(FooterSocialLinks, { links: normalizeSocialLinks({}) }))).toBe("");
});

test("social URLs must point to genuine HTTPS social sites", () => {
  expect(normalizeSocialUrl("https://www.instagram.com/aloyri/", "instagram")).toBe("https://www.instagram.com/aloyri/");
  expect(normalizeSocialUrl("https://www.linkedin.com/company/aloyri/", "linkedin")).toBe("https://www.linkedin.com/company/aloyri/");
  expect(normalizeSocialUrl("https://x.com/aloyri", "x")).toBe("https://x.com/aloyri");
  expect(normalizeSocialUrl("https://twitter.com/aloyri", "x")).toBe("https://twitter.com/aloyri");
  for (const unsafe of [
    "javascript:alert(1)",
    "https://instagram.com.evil.example/aloyri",
    "http://instagram.com/aloyri",
    "https://www.instagram.com@evil.example/aloyri",
    "https://facebook.com/aloyri",
    "https://user:pass@instagram.com/aloyri",
  ]) {
    expect(normalizeSocialUrl(unsafe, "instagram")).toBe("");
  }
  expect(normalizeSocialLinks({ instagram: "javascript:alert(1)", linkedin: "https://evil.example/" })).toEqual({
    instagram: "", facebook: "", x: "", linkedin: "",
  });
});
