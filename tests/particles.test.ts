import { describe, expect, it } from 'vitest';

import { getParticleDensity } from '../src/render/particles';

describe('particle density', () => {
  it('halves every density parameter when reduced motion is enabled', () => {
    const full = getParticleDensity(false);
    const reduced = getParticleDensity(true);

    for (const key of Object.keys(full) as Array<keyof typeof full>) {
      expect(reduced[key]).toBe(full[key] / 2);
    }
  });
});
