import { expect, test } from '@playwright/test';

interface NeonArtDebugWindow extends Window {
  __NEON_DEBUG__: {
    getRenderStats: () => { drawCalls: number; triangles: number };
    getSceneInfo: () => {
      backgroundHex: string | null;
      fogEnabled: boolean;
      skyEnabled: boolean;
    };
  };
}

test('renders the synthwave art direction within budget', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await expect(canvas).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as Window & {
        __NEON_DEBUG__: { openMenu: (name: 'none') => void };
      }
    ).__NEON_DEBUG__.openMenu('none'),
  );

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as NeonArtDebugWindow
          ).__NEON_DEBUG__.getRenderStats().drawCalls,
      ),
    )
    .toBeGreaterThan(0);

  const stats = await page.evaluate(() =>
    (window as unknown as NeonArtDebugWindow).__NEON_DEBUG__.getRenderStats(),
  );
  expect(stats.drawCalls).toBeGreaterThan(0);
  expect(stats.drawCalls).toBeLessThan(300);
  expect(stats.triangles).toBeGreaterThan(0);
  expect(stats.triangles).toBeLessThan(500_000);

  const scene = await page.evaluate(() =>
    (window as unknown as NeonArtDebugWindow).__NEON_DEBUG__.getSceneInfo(),
  );
  expect(scene.fogEnabled).toBe(true);
  expect(scene.skyEnabled).toBe(true);
  expect(scene.backgroundHex).toBe('#1a0b2e');

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-art.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
