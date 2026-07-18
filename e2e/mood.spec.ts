import { expect, test } from '@playwright/test';

interface MoodSceneInfo {
  fogHex: string | null;
  skyZenithHex: string;
  skyHorizonHex: string;
  dayPhase: number;
}

interface MoodDebugWindow extends Window {
  __NEON_DEBUG__: {
    openMenu: (name: 'none') => void;
    setDayPhase: (phase: number) => void;
    getSceneInfo: () => MoodSceneInfo;
    teleport: (x: number, y: number, z: number) => void;
  };
}

test('changes the night mood and plays a skippable stele typewriter', async ({
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
    (window as unknown as MoodDebugWindow).__NEON_DEBUG__.openMenu('none'),
  );
  await expect(canvas).toHaveAttribute('data-controls', 'ready');

  const sunset = await page.evaluate(() =>
    (window as unknown as MoodDebugWindow).__NEON_DEBUG__.getSceneInfo(),
  );
  await page.evaluate(() =>
    (window as unknown as MoodDebugWindow).__NEON_DEBUG__.setDayPhase(0.5),
  );
  const midnight = await page.evaluate(() =>
    (window as unknown as MoodDebugWindow).__NEON_DEBUG__.getSceneInfo(),
  );
  expect(midnight.dayPhase).toBeCloseTo(0.5, 2);
  expect(midnight.skyZenithHex).not.toBe(sunset.skyZenithHex);
  expect(midnight.skyHorizonHex).not.toBe(sunset.skyHorizonHex);
  expect(midnight.fogHex).not.toBe(sunset.fogHex);

  await page.evaluate(() =>
    (window as unknown as MoodDebugWindow).__NEON_DEBUG__.teleport(
      14,
      2.5,
      -30,
    ),
  );
  await page.keyboard.press('e');
  const steleText = page.locator('.stele-overlay p');
  await expect(steleText).toBeVisible();
  await expect(steleText).toHaveAttribute('data-typing', 'true');
  const partial = await steleText.textContent();
  const full = await steleText.getAttribute('data-full-text');
  expect(partial).not.toBeNull();
  expect(full).not.toBeNull();
  expect(partial!.length).toBeLessThan(full!.length);

  await page.keyboard.press('x');
  await expect(steleText).toHaveText(full!);
  await expect(steleText).toHaveAttribute('data-typing', 'false');
  await page.keyboard.press('e');
  await expect(page.locator('.stele-overlay')).toBeHidden();

  await page.screenshot({
    path: testInfo.outputPath('neon-echo-mood.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
