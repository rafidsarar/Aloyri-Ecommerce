import { expect, test } from "@playwright/test";
import { defaultSocialLinks, socialPlatforms, validSocialUrl } from "../src/lib/social-links";

test("social links default to hidden and have matching platform keys", () => {
  expect(socialPlatforms).toHaveLength(7);
  for (const name of socialPlatforms) expect(defaultSocialLinks[name]).toBe("");
});

test("only HTTPS social links from the matching platform pass validation", () => {
  expect(validSocialUrl("instagram", " https://www.instagram.com/aloyri/ ")).toBe("https://www.instagram.com/aloyri/");
  expect(validSocialUrl("facebook", "https://facebook.com/aloyri")).toBe("https://facebook.com/aloyri");
  expect(validSocialUrl("tiktok", "https://www.tiktok.com/@aloyri")).toBe("https://www.tiktok.com/@aloyri");
  expect(validSocialUrl("youtube", "https://www.youtube.com/@aloyri")).toBe("https://www.youtube.com/@aloyri");
  expect(validSocialUrl("x", "https://x.com/aloyri")).toBe("https://x.com/aloyri");
  expect(validSocialUrl("linkedin", "https://www.linkedin.com/company/aloyri")).toBe("https://www.linkedin.com/company/aloyri");
  expect(validSocialUrl("whatsapp", "https://wa.me/8801700000000")).toBe("https://wa.me/8801700000000");
  for (const bad of ["javascript:alert(1)", "http://instagram.com/aloyri", "https://instagram.com.evil.com/aloyri", "https://evil.com/instagram.com", "https://user:pass@instagram.com/aloyri", "https://instagram.com:9999/aloyri", "https://facebook.com/aloyri"]) {
    expect(validSocialUrl("instagram", bad), bad).toBe("");
  }
});
