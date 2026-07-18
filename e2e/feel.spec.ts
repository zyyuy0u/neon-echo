import { expect, test } from '@playwright/test';

interface FeelDebugWindow extends Window {
  __NEON_DEBUG__: {
    getPlayerPosition: () => { x: number; y: number; z: number };
    getSaveData: () => { tutorialFlags: { jumpGap: boolean } };
    teleport: (x: number, y: number, z: number) => void;
  };
}

test('plays the opening and persists the one-shot jump tutorial', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('feel-test-initialized') === null) {
      localStorage.clear();
      sessionStorage.setItem('feel-test-initialized', 'true');
    }
  });

  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await page.getByRole('button', { name: '新遊戲' }).click();
  const openingSubtitle = page.getByText('回聲行者，醒來。');
  await expect(openingSubtitle).toBeVisible();
  await expect
    .poll(() =>
      openingSubtitle.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0.5);
  await expect(canvas).toHaveAttribute('data-controls', 'ready', {
    timeout: 8_000,
  });

  const start = await page.evaluate(() =>
    (window as unknown as FeelDebugWindow).__NEON_DEBUG__.getPlayerPosition(),
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
  const moved = await page.evaluate(() =>
    (window as unknown as FeelDebugWindow).__NEON_DEBUG__.getPlayerPosition(),
  );
  expect(Math.hypot(moved.x - start.x, moved.z - start.z)).toBeGreaterThan(0.5);

  await page.evaluate(() =>
    (window as unknown as FeelDebugWindow).__NEON_DEBUG__.teleport(0, 1.2, -66),
  );
  const jumpTutorial = page.locator(
    '.gameplay-message[data-tutorial="jumpGap"]',
  );
  await expect(jumpTutorial).toBeVisible();
  await page.keyboard.press('Space');
  await expect(jumpTutorial).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as FeelDebugWindow).__NEON_DEBUG__.getSaveData()
            .tutorialFlags.jumpGap,
      ),
    )
    .toBe(true);

  await page.reload();
  await expect(canvas).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  await page.getByRole('button', { name: '繼續' }).click();
  await expect(canvas).toHaveAttribute('data-controls', 'ready');
  await page.evaluate(() =>
    (window as unknown as FeelDebugWindow).__NEON_DEBUG__.teleport(0, 1.2, -66),
  );
  await page.waitForTimeout(500);
  await expect(
    page.locator('.gameplay-message[data-tutorial="jumpGap"]'),
  ).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-feel.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
