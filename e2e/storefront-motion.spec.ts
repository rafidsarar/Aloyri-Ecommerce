import { expect, test } from "@playwright/test";

test("scroll reverses scene rotation and pointer layers have different depths", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/shop");
  const scene = page.locator(".botanical-scene");
  await expect(page.locator('[data-motion="enabled"]')).toBeVisible();
  const turn = () => scene.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue("--turn")));
  const initial = await turn();
  await page.evaluate(() => window.scrollTo(0, 180));
  await expect.poll(turn).toBeGreaterThan(initial);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(turn).toBeCloseTo(initial, 1);
  const box = await scene.boundingBox();
  await page.mouse.move(box!.x + box!.width * .8, box!.y + box!.height * .4);
  await expect.poll(() => scene.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue("--pointer-x")))).toBeGreaterThan(0);
  const transforms = await scene.locator('.motion-midground,.motion-foreground').evaluateAll(els => els.map(el => getComputedStyle(el).transform));
  expect(transforms[0]).not.toBe(transforms[1]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-motion="enabled"]')).toHaveCount(0);
  await expect(scene.locator('.motion-rotate')).toHaveCSS('transform', 'none');
});

test("routine cards stack on desktop and reveal words on arrival", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto('/');
  const heading = page.locator('.home-routine-layout [data-text-reveal]');
  await expect(heading).toHaveAttribute('data-revealed', 'false');
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute('data-revealed', 'true');
  await expect(page.locator('.home-routine-card').first()).toHaveCSS('position', 'sticky');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.home-routine-card').first()).not.toHaveCSS('position', 'sticky');
});
