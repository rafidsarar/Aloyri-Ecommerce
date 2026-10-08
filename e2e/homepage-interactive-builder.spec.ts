import { expect, test } from "@playwright/test";

test("homepage Builder preview renders real sections and applies unsaved order and text", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.title = "Builder interactive homepage";
    frame.src = "/?builderPreview=1";
    frame.style.width = "390px";
    document.body.appendChild(frame);
  });
  const frame = page.frameLocator('iframe[title="Builder interactive homepage"]');
  await expect(frame.locator("[data-builder-core='hero']")).toBeVisible({ timeout: 30_000 });
  await expect(frame.locator("[data-builder-core='brandStory']")).toHaveCount(1);
  const order = ["core:brandStory", "core:hero"];
  await page.evaluate(order => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Builder interactive homepage"]');
    iframe?.contentWindow?.postMessage({
      type: "aloyri-builder-draft",
      layout: { order, hiddenCore: [], blocks: [] },
      coreContent: { headline: "Preview-only heading" },
    }, window.location.origin);
  }, order);
  await expect(frame.locator("[data-builder-core='hero'] .store-hero-heading")).toHaveText("Preview-only heading");
  await expect.poll(() => frame.locator("[data-builder-core]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-builder-core")))).toEqual(["brandStory", "hero"]);
});
