import { expect, test } from '@playwright/test';

interface NeonDebugWindow extends Window {
  __NEON_DEBUG__: {
    getPlayerPosition: () => { x: number; y: number; z: number };
    isGrounded: () => boolean;
  };
}

test('moves and jumps through the development debug hook', async ({ page }) => {
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
      page.evaluate(() =>
        (window as unknown as NeonDebugWindow).__NEON_DEBUG__.isGrounded(),
      ),
    )
    .toBe(true);

  const start = await page.evaluate(() =>
    (window as unknown as NeonDebugWindow).__NEON_DEBUG__.getPlayerPosition(),
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1_000);
  await page.keyboard.up('KeyW');
  const moved = await page.evaluate(() =>
    (window as unknown as NeonDebugWindow).__NEON_DEBUG__.getPlayerPosition(),
  );
  expect(Math.hypot(moved.x - start.x, moved.z - start.z)).toBeGreaterThan(2);

  const jumpStartY = moved.y;
  let maximumY = jumpStartY;
  await page.keyboard.down('Space');
  for (let sample = 0; sample < 12; sample += 1) {
    await page.waitForTimeout(20);
    const position = await page.evaluate(() =>
      (window as unknown as NeonDebugWindow).__NEON_DEBUG__.getPlayerPosition(),
    );
    maximumY = Math.max(maximumY, position.y);
  }
  await page.keyboard.up('Space');
  expect(maximumY - jumpStartY).toBeGreaterThan(0.5);

  await page.waitForTimeout(3_000);
  expect(browserErrors).toEqual([]);
});
