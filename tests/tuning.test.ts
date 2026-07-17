import { afterEach, describe, expect, it } from 'vitest';

import { applyReducedMotion, tuning } from '../src/core/tuning';

describe('reduced motion tuning', () => {
  afterEach(() => applyReducedMotion(false));

  it('removes FOV kick and camera shake and halves particles', () => {
    applyReducedMotion(true);

    expect(tuning.cameraFovKickCoefficient).toBe(0);
    expect(tuning.cameraShakeStrength).toBe(0);
    expect(tuning.particleDensityMultiplier).toBe(0.5);
  });
});
