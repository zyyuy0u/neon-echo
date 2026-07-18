import { describe, expect, it } from 'vitest';

import {
  getDistanceWaveIndex,
  getEndingAnimationConfig,
  getEndingWaveIndex,
} from '../src/systems/ending/waves';

describe('ending city-light waves', () => {
  it.each([
    [0, 0],
    [24.999, 0],
    [25, 1],
    [49.999, 1],
    [50, 2],
    [74.999, 2],
    [75, 3],
    [100, 3],
    [125, 3],
  ])('maps distance %d to four-wave index %d', (distance, expected) => {
    expect(getDistanceWaveIndex(distance, 100, 4)).toBe(expected);
  });

  it('reverses distance order for rest', () => {
    expect(getEndingWaveIndex('awaken', 0, 100, 4)).toBe(0);
    expect(getEndingWaveIndex('awaken', 100, 100, 4)).toBe(3);
    expect(getEndingWaveIndex('rest', 0, 100, 4)).toBe(3);
    expect(getEndingWaveIndex('rest', 100, 100, 4)).toBe(0);
  });

  it('uses the specified reduced-motion degradation', () => {
    expect(getEndingAnimationConfig(false)).toEqual({
      waveCount: 4,
      durationSeconds: 4,
    });
    expect(getEndingAnimationConfig(true)).toEqual({
      waveCount: 2,
      durationSeconds: 1.5,
    });
  });
});
