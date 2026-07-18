import { expect, test } from '@playwright/test';

interface NeonWorldDebugWindow extends Window {
  __NEON_DEBUG__: {
    getWorldStats: () => {
      zones: number;
      landmarks: number;
      shards: number;
      steles: number;
      sanctuaries: number;
      buildings: number;
      signs: number;
      streetlights: number;
      trafficSignals: number;
      benches: number;
      trashBins: number;
      skylineBuildings: number;
      flightPaths: number;
    };
    getRenderStats: () => { drawCalls: number; triangles: number };
    teleport: (x: number, y: number, z: number) => void;
  };
}

test('builds and renders the complete world within budget', async ({
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

  const worldStats = await page.evaluate(() =>
    (window as unknown as NeonWorldDebugWindow).__NEON_DEBUG__.getWorldStats(),
  );
  expect(worldStats).toEqual({
    zones: 5,
    landmarks: 4,
    shards: 40,
    steles: 12,
    sanctuaries: 3,
    buildings: 54,
    signs: 48,
    streetlights: 78,
    trafficSignals: 12,
    benches: 24,
    trashBins: 24,
    skylineBuildings: 48,
    flightPaths: 4,
  });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as NeonWorldDebugWindow
          ).__NEON_DEBUG__.getRenderStats().drawCalls,
      ),
    )
    .toBeGreaterThan(0);
  const plazaStats = await page.evaluate(() =>
    (window as unknown as NeonWorldDebugWindow).__NEON_DEBUG__.getRenderStats(),
  );
  expect(plazaStats.drawCalls).toBeLessThan(300);
  expect(plazaStats.triangles).toBeLessThan(500_000);

  await page.evaluate(() =>
    (window as unknown as NeonWorldDebugWindow).__NEON_DEBUG__.teleport(
      300,
      72,
      50,
    ),
  );
  await page.waitForTimeout(500);
  const spireStats = await page.evaluate(() =>
    (window as unknown as NeonWorldDebugWindow).__NEON_DEBUG__.getRenderStats(),
  );
  expect(spireStats.drawCalls).toBeLessThan(300);
  expect(spireStats.triangles).toBeLessThan(500_000);

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-world-spire.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
