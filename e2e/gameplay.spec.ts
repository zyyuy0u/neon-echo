import { expect, test } from '@playwright/test';

interface GameplayDebugWindow extends Window {
  __NEON_DEBUG__: {
    getPlayerPosition: () => { x: number; y: number; z: number };
    teleport: (x: number, y: number, z: number) => void;
    grantAbility: (ability: 'dash' | 'doubleJump' | 'glide') => boolean;
    getAbilities: () => readonly string[];
    getCharacterInfo: () => {
      avatarLoaded: boolean;
      animationCount: number;
      currentClip: string | null;
    };
    getShardCount: () => number;
    collectNearestShard: () => string | undefined;
    getAudioState: () => {
      initialized: boolean;
      volume: number;
      respectsVolume: boolean;
    };
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

  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as GameplayDebugWindow
        ).__NEON_DEBUG__.getCharacterInfo(),
      ),
    )
    .toMatchObject({ avatarLoaded: true });
  const idleAvatar = await page.evaluate(() =>
    (
      window as unknown as GameplayDebugWindow
    ).__NEON_DEBUG__.getCharacterInfo(),
  );
  expect(idleAvatar.animationCount).toBeGreaterThanOrEqual(20);
  expect(idleAvatar.currentClip).toContain('Idle');

  await page.keyboard.down('KeyW');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as GameplayDebugWindow
          ).__NEON_DEBUG__.getCharacterInfo().currentClip,
      ),
    )
    .toContain('Run');
  await page.waitForTimeout(1_000);
  await page.keyboard.up('KeyW');

  await page.keyboard.press('KeyW');
  // 手勢解鎖與事件派發有時序落差，斷言採輪詢式。
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as GameplayDebugWindow
        ).__NEON_DEBUG__.getAudioState(),
      ),
    )
    .toMatchObject({
      initialized: true,
      volume: 0.8,
      respectsVolume: true,
    });

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
