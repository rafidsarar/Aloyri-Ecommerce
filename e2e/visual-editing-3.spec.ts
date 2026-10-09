import { expect, test } from "@playwright/test";

test("clicking an existing homepage section selects it in the parent Builder", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.title = "Editing homepage";
    frame.src = "/?builderPreview=1";
    document.body.appendChild(frame);
    window.addEventListener("message", event => {
      if (event.origin === window.location.origin && event.data?.type === "aloyri-builder-select") {
        document.body.setAttribute("data-selected", event.data.id);
      }
    });
  });
  const preview = page.frameLocator('iframe[title="Editing homepage"]');
  await expect(preview.locator("[data-builder-core='hero']")).toBeVisible({ timeout: 30000 });
  await preview.locator("[data-builder-core='hero']").click({ position: { x: 10, y: 10 } });
  await expect(page.locator("body")).toHaveAttribute("data-selected", "core:hero");
});

test("public page previews allow same-origin framing but protected pages still deny it", async ({ request }) => {
  for (const path of ["/", "/about", "/shipping-delivery", "/returns-refunds", "/contact", "/faq", "/shop"]) {
    const response = await request.get(path);
    expect(response.headers()["x-frame-options"], path).toBe("SAMEORIGIN");
    expect(response.headers()["content-security-policy"], path).toContain("frame-ancestors 'self'");
  }
  for (const path of ["/admin/builder", "/account", "/checkout"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["x-frame-options"], path).toBe("DENY");
    expect(response.headers()["content-security-policy"], path).toContain("frame-ancestors 'none'");
  }
});
