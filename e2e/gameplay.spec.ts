import { expect, test } from '@playwright/test';

interface GameplayDebugWindow extends Window {
  __NEON_DEBUG__: {
    getPlayerPosition: () => { x: number; y: number; z: number };
    teleport: (x: number, y: number, z: number) => void;
    grantAbility: (ability: 'dash' | 'doubleJump' | 'glide') => boolean;
    getAbilities: () => readonly string[];
    getShardCount: () => number;
    collectNearestShard: () => string | undefined;
  };
}

test('uses the dash and shard collection debug hooks', async ({
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
    (
      window as unknown as Window & {
        __NEON_DEBUG__: { openMenu: (name: 'none') => void };
      }
    ).__NEON_DEBUG__.openMenu('none'),
  );

  const measureMovement = async (dash: boolean): Promise<number> => {
    await page.evaluate(() =>
      (window as unknown as GameplayDebugWindow).__NEON_DEBUG__.teleport(
        0,
        1.2,
        0,
      ),
    );
    await page.waitForTimeout(100);
    const start = await page.evaluate(() =>
      (
        window as unknown as GameplayDebugWindow
      ).__NEON_DEBUG__.getPlayerPosition(),
    );
    await page.keyboard.down('KeyW');
    if (dash) await page.keyboard.down('Shift');
    await page.waitForTimeout(220);
    if (dash) await page.keyboard.up('Shift');
    await page.keyboard.up('KeyW');
    const end = await page.evaluate(() =>
      (
        window as unknown as GameplayDebugWindow
      ).__NEON_DEBUG__.getPlayerPosition(),
    );
    return Math.hypot(end.x - start.x, end.z - start.z);
  };

  const baseline = await measureMovement(false);
  await page.evaluate(() =>
    (window as unknown as GameplayDebugWindow).__NEON_DEBUG__.grantAbility(
      'dash',
    ),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as GameplayDebugWindow
        ).__NEON_DEBUG__.getAbilities(),
      ),
    )
    .toContain('dash');
  const dashed = await measureMovement(true);
  expect(dashed).toBeGreaterThan(baseline * 1.5);

  const before = await page.evaluate(() =>
    (window as unknown as GameplayDebugWindow).__NEON_DEBUG__.getShardCount(),
  );
  await page.evaluate(() =>
    (
      window as unknown as GameplayDebugWindow
    ).__NEON_DEBUG__.collectNearestShard(),
  );
  const after = await page.evaluate(() =>
    (window as unknown as GameplayDebugWindow).__NEON_DEBUG__.getShardCount(),
  );
  expect(after).toBe(before + 1);

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-gameplay.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
