import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`homepage product carousel cards stay aligned at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const track = page.getByRole("region", {
      name: "Browse all selling products horizontally",
    });
    await expect(track).toBeVisible();

    const cards = track.getByTestId("home-product-carousel-card");
    expect(await cards.count()).toBeGreaterThanOrEqual(2);

    const geometry = await cards.evaluateAll((elements) =>
      elements.slice(0, 4).map((element) => {
        const frame = element.getBoundingClientRect();
        const article = element.querySelector("article")?.getBoundingClientRect();
        const button = element.querySelector(".store-product-card-action")?.getBoundingClientRect();
        return {
          x: frame.x,
          y: frame.y,
          right: frame.right,
          bottom: frame.bottom,
          articleTop: article?.top,
          articleBottom: article?.bottom,
          buttonBottom: button?.bottom,
        };
      }),
    );

    for (const frame of geometry) {
      expect(Math.abs(frame.y - geometry[0].y)).toBeLessThanOrEqual(2);
      expect(Math.abs(frame.bottom - geometry[0].bottom)).toBeLessThanOrEqual(2);
    }
    for (let i = 1; i < geometry.length; i++) {
      expect(geometry[i].x - geometry[i - 1].right).toBeGreaterThanOrEqual(12);
    }

    // When the CRM catalog is synced, cards and their CTA rows must stretch
    // uniformly even when product names and descriptions wrap differently.
    const rendered = geometry.filter((frame) => frame.articleTop !== undefined);
    if (rendered.length > 1) {
      for (const frame of rendered) {
        expect(Math.abs(frame.articleTop! - rendered[0].articleTop!)).toBeLessThanOrEqual(2);
        expect(Math.abs(frame.articleBottom! - rendered[0].articleBottom!)).toBeLessThanOrEqual(2);
        expect(Math.abs(frame.buttonBottom! - rendered[0].buttonBottom!)).toBeLessThanOrEqual(2);
      }
    }

    const controls = page.getByRole("group", { name: "Product carousel navigation" });
    await expect(controls).toBeVisible();
    const controlsRect = await controls.boundingBox();
    expect(controlsRect).not.toBeNull();
    if (controlsRect) expect(controlsRect.y + controlsRect.height).toBeLessThanOrEqual(geometry[0].y + 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
