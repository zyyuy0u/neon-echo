import { expect, test } from '@playwright/test';

test('loads the playable canvas without browser errors', async ({
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

  const size = await canvas.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);

  await page.waitForTimeout(3_000);
  await page.screenshot({
    path: testInfo.outputPath('neon-echo.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
