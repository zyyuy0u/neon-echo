import { expect, test } from '@playwright/test';

interface QolSave {
  abilities: readonly string[];
  discoveredZoneIds: readonly string[];
  puzzles: { pulseTrack: { completed: boolean } };
}

interface QolDebugWindow extends Window {
  __NEON_DEBUG__: {
    openMenu: (name: 'none') => void;
    teleport: (x: number, y: number, z: number) => void;
    debugCompletePuzzle: (id: string) => boolean;
    getPlayerPosition: () => { x: number; y: number; z: number };
    getSaveData: () => QolSave;
  };
}

test('discovers a sanctuary, completes it, and teleports by keyboard', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('qol-test-initialized') === null) {
      localStorage.clear();
      sessionStorage.setItem('qol-test-initialized', 'true');
    }
  });

  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await page.evaluate(() =>
    (window as unknown as QolDebugWindow).__NEON_DEBUG__.openMenu('none'),
  );

  const compass = page.locator('.compass-bar');
  await expect(compass).toBeVisible();
  await expect(compass.locator('[data-kind="landmark"]')).toHaveCount(4);

  const discoveredBefore = await page.evaluate(
    () =>
      (window as unknown as QolDebugWindow).__NEON_DEBUG__.getSaveData()
        .discoveredZoneIds.length,
  );
  await page.evaluate(() =>
    (window as unknown as QolDebugWindow).__NEON_DEBUG__.teleport(0, 4, -350),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as QolDebugWindow).__NEON_DEBUG__.getSaveData()
            .discoveredZoneIds,
      ),
    )
    .toContain('skylift');
  const discoveredAfter = await page.evaluate(
    () =>
      (window as unknown as QolDebugWindow).__NEON_DEBUG__.getSaveData()
        .discoveredZoneIds.length,
  );
  expect(discoveredAfter).toBe(discoveredBefore + 1);
  await expect(compass.locator('[data-kind="sanctuary"]')).toHaveCount(1);

  expect(
    await page.evaluate(() =>
      (window as unknown as QolDebugWindow).__NEON_DEBUG__.debugCompletePuzzle(
        'sanctuary-dash',
      ),
    ),
  ).toBe(true);
  // fanfare 期間輸入凍結（controls locked），結束後交還控制權並點亮能力圖示。
  await expect(canvas).toHaveAttribute('data-controls', 'locked', {
    timeout: 1_000,
  });
  await expect(canvas).toHaveAttribute('data-controls', 'ready', {
    timeout: 3_000,
  });
  await expect(page.locator('.ability-icon.is-unlocked')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '訊號暫停' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: '傳送' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '錨點傳送' })).toBeVisible();
  await expect(page.locator('[data-warp-id="warp-plaza"]')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect
    .poll(async () => {
      const position = await page.evaluate(() =>
        (
          window as unknown as QolDebugWindow
        ).__NEON_DEBUG__.getPlayerPosition(),
      );
      return Math.hypot(position.x, position.y - 1.2, position.z);
    })
    .toBeLessThanOrEqual(2);

  await page.reload();
  await expect(canvas).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-controls', 'ready');
  const restored = await page.evaluate(() =>
    (window as unknown as QolDebugWindow).__NEON_DEBUG__.getSaveData(),
  );
  expect(restored.discoveredZoneIds).toContain('skylift');
  expect(restored.puzzles.pulseTrack.completed).toBe(true);
  expect(restored.abilities).toContain('dash');

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-qol.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
