import { expect, test } from '@playwright/test';

interface MapDebugWindow extends Window {
  __NEON_DEBUG__: {
    openMenu: (name: 'none') => void;
    getObjective: () => { id: string; label: string };
    debugCompletePuzzle: (id: string) => boolean;
  };
}

test('opens the world map and advances the tracked objective', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.addInitScript(() => localStorage.clear());

  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await page.evaluate(() =>
    (window as unknown as MapDebugWindow).__NEON_DEBUG__.openMenu('none'),
  );

  await page.keyboard.press('KeyM');
  const map = page.locator('#map-screen');
  await expect(map).toBeVisible();
  await expect(map.locator('[data-kind="player"]')).toHaveCount(1);
  await expect(map.locator('[data-kind="landmark"]')).toHaveCount(4);
  expect(
    await map.locator('.map-zone[data-fog="undiscovered"]').count(),
  ).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(map).toBeHidden();
  await expect(canvas).toHaveAttribute('data-controls', 'ready');

  expect(
    await page.evaluate(
      () =>
        (window as unknown as MapDebugWindow).__NEON_DEBUG__.getObjective().id,
    ),
  ).toBe('sanctuary-1');
  expect(
    await page.evaluate(() =>
      (window as unknown as MapDebugWindow).__NEON_DEBUG__.debugCompletePuzzle(
        'pulseTrack',
      ),
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as MapDebugWindow).__NEON_DEBUG__.getObjective()
            .id,
      ),
    )
    .toBe('sanctuary-2');
  await expect(page.locator('.objective-hud')).toHaveAttribute(
    'data-objective-id',
    'sanctuary-2',
  );

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-map.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
