import { expect, test } from '@playwright/test';

interface CityDebugWindow extends Window {
  __NEON_DEBUG__: {
    getWorldStats: () => {
      signs: number;
      streetlights: number;
      trafficSignals: number;
      skylineBuildings: number;
      flightPaths: number;
    };
    getRenderStats: () => { drawCalls: number; triangles: number };
    openMenu: (name: 'none') => void;
    teleport: (x: number, y: number, z: number) => void;
  };
}

test('renders a populated city from street, facade, and skyline views', async ({
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
  await page.evaluate(() =>
    (window as unknown as CityDebugWindow).__NEON_DEBUG__.openMenu('none'),
  );

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as CityDebugWindow).__NEON_DEBUG__.getRenderStats()
            .drawCalls,
      ),
    )
    .toBeGreaterThan(0);
  const renderStats = await page.evaluate(() =>
    (window as unknown as CityDebugWindow).__NEON_DEBUG__.getRenderStats(),
  );
  expect(renderStats.drawCalls).toBeLessThan(300);
  expect(renderStats.triangles).toBeLessThan(500_000);

  const worldStats = await page.evaluate(() =>
    (window as unknown as CityDebugWindow).__NEON_DEBUG__.getWorldStats(),
  );
  expect(worldStats.signs).toBeGreaterThanOrEqual(40);
  expect(worldStats.streetlights).toBeGreaterThanOrEqual(60);
  expect(worldStats.trafficSignals).toBeGreaterThanOrEqual(10);
  expect(worldStats.skylineBuildings).toBeGreaterThanOrEqual(30);
  expect(worldStats.flightPaths).toBeGreaterThanOrEqual(3);
  expect(worldStats.flightPaths).toBeLessThanOrEqual(5);

  const views = [
    { name: 'street', position: [0, 1.2, -30] },
    { name: 'facade', position: [35, 2, -48] },
    { name: 'skyline', position: [300, 72, 50] },
  ] as const;
  for (const view of views) {
    await page.evaluate(
      ([x, y, z]) =>
        (window as unknown as CityDebugWindow).__NEON_DEBUG__.teleport(x, y, z),
      view.position,
    );
    await page.waitForTimeout(350);
    await page.screenshot({
      path: testInfo.outputPath(`city-${view.name}.png`),
      fullPage: true,
    });
  }
  expect(browserErrors).toEqual([]);
});
