import { expect, test } from '@playwright/test';

interface UiDebugWindow extends Window {
  __NEON_DEBUG__: {
    collectNearestShard: () => string | undefined;
    getSaveData: () => { collectedShardIds: readonly string[] };
  };
}

test('operates menus by keyboard and restores a saved shard', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#game-canvas')).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: 15_000 },
  );
  await expect(page.getByRole('heading', { name: 'NEON ECHO' })).toBeVisible();

  await expect(page.getByRole('button', { name: '新遊戲' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.hud')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: '訊號暫停' }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-setting="sensitivity"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-setting="language"]')).toBeFocused();
  // headless Chromium 無法用模擬按鍵操作原生 select 的下拉選單，
  // 鍵盤可達性以上行 focus 斷言驗證，切換值改用 selectOption 觸發。
  await page.locator('[data-setting="language"]').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-layer')).toBeHidden();

  await page.evaluate(() =>
    (window as unknown as UiDebugWindow).__NEON_DEBUG__.collectNearestShard(),
  );
  const savedCount = await page.evaluate(
    () =>
      (window as unknown as UiDebugWindow).__NEON_DEBUG__.getSaveData()
        .collectedShardIds.length,
  );
  expect(savedCount).toBe(1);

  await page.reload();
  await expect(page.locator('#game-canvas')).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: 15_000 },
  );
  // 稍早已切換語言為 en 並隨存檔持久化，重整後選單為英文。
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.shard-counter')).toContainText('1 / 40');

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-ui.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
