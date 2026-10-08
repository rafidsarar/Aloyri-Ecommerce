import { expect, test } from "@playwright/test";

test("Builder live homepage preview is frameable only from its own origin", async ({ page, request }) => {
  const homepage = await request.get("/");
  expect(homepage.status()).toBe(200);
  expect(homepage.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(homepage.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");

  // Only the public homepage is eligible for the Builder's device iframe.
  // Admin, account and checkout pages retain the stronger anti-clickjacking policy.
  for (const path of ["/admin/builder", "/account", "/checkout"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["x-frame-options"], path).toBe("DENY");
    expect(response.headers()["content-security-policy"], path).toContain("frame-ancestors 'none'");
  }

  await page.goto("/");
  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.title = "Live storefront device preview";
    iframe.src = "/";
    iframe.width = "390";
    iframe.height = "780";
    document.body.append(iframe);
  });

  // A blocked iframe may contain an about:blank body, so assert that the real
  // homepage <main> rendered inside its same-origin browsing context.
  await expect.poll(() => page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Live storefront device preview"]');
    return frame?.contentDocument?.querySelector("main")?.tagName ?? null;
  }), { timeout: 30_000 }).toBe("MAIN");
});
