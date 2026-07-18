import { expect, test } from '@playwright/test';

interface ExtrasDebugWindow extends Window {
  __NEON_DEBUG__: {
    openMenu: (name: 'none' | 'pause') => void;
    collectNearestShard: () => string | undefined;
    getAchievements: () => readonly string[];
    enterPhotoMode: () => boolean;
  };
}

test('unlocks an achievement, takes a photo, and restores progress', async ({
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
    (window as unknown as ExtrasDebugWindow).__NEON_DEBUG__.openMenu('none'),
  );

  await page.evaluate(() =>
    (
      window as unknown as ExtrasDebugWindow
    ).__NEON_DEBUG__.collectNearestShard(),
  );
  await expect(page.locator('.achievement-toast')).toContainText('第一道回聲');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as ExtrasDebugWindow
        ).__NEON_DEBUG__.getAchievements(),
      ),
    )
    .toContain('first-shard');

  await page.evaluate(() =>
    (window as unknown as ExtrasDebugWindow).__NEON_DEBUG__.openMenu('pause'),
  );
  await page.getByRole('button', { name: '成就與統計' }).click();
  await expect(
    page.locator('[data-achievement-id="first-shard"]'),
  ).toHaveClass(/is-unlocked/);
  await expect(page.locator('.achievement-progress')).toContainText('1 / 12');
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '繼續遊戲' }).click();

  await page.evaluate(() =>
    (window as unknown as ExtrasDebugWindow).__NEON_DEBUG__.enterPhotoMode(),
  );
  await expect(canvas).toHaveAttribute('data-photo-mode', 'active');
  await expect(page.locator('.hud')).toBeHidden();

  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^neon-echo-\d{8}-\d{6}\.png$/,
  );

  await page.keyboard.press('KeyP');
  await expect(canvas).not.toHaveAttribute('data-photo-mode', 'active');
  await expect(page.locator('.hud')).toBeVisible();

  await page.reload();
  await expect(canvas).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as ExtrasDebugWindow
        ).__NEON_DEBUG__.getAchievements(),
      ),
    )
    .toContain('first-shard');

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-extras.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
