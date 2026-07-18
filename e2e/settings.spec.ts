import { expect, test } from '@playwright/test';

interface SettingsDebugWindow extends Window {
  __NEON_DEBUG__: {
    getRenderInfo: () => { pixelRatio: number; resolutionScale: number };
    getSceneInfo: () => { bloomEnabled: boolean };
    getAudioState: () => { musicVolume: number; sfxVolume: number };
  };
}

test('applies and persists graphics and split audio settings', async ({
  page,
}) => {
  // 注意：不可用 addInitScript 清 storage——它會在每次導航（含驗證持久化的
  // reload）重複執行，把要驗證的存檔一併清掉。改為首次載入後一次性清除。
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#game-canvas')).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: 15_000 },
  );

  await page.getByRole('button', { name: '設定' }).click();
  await expect(page.getByRole('heading', { name: '圖形' })).toBeVisible();

  await page
    .locator('[data-setting="resolution-scale"]')
    .selectOption('0.75');
  const expectedPixelRatio = await page.evaluate(
    () => Math.min(window.devicePixelRatio, 2) * 0.75,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as SettingsDebugWindow).__NEON_DEBUG__
            .getRenderInfo().pixelRatio,
      ),
    )
    .toBe(expectedPixelRatio);

  await page.locator('[data-setting="bloom-enabled"]').uncheck();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as SettingsDebugWindow).__NEON_DEBUG__.getSceneInfo()
          .bloomEnabled,
    ),
  ).toBe(false);

  await page.locator('[data-setting="music-volume"]').fill('0.35');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as SettingsDebugWindow).__NEON_DEBUG__
            .getAudioState().musicVolume,
      ),
    )
    .toBe(0.35);

  await page.reload();
  await expect(page.locator('#game-canvas')).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: '設定' }).click();
  await expect(
    page.locator('[data-setting="resolution-scale"]'),
  ).toHaveValue('0.75');
  await expect(page.locator('[data-setting="bloom-enabled"]')).not.toBeChecked();
  await expect(page.locator('[data-setting="music-volume"]')).toHaveValue(
    '0.35',
  );
});
