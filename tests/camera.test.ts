import { describe, expect, it } from 'vitest';

import { getAutoBehindTargetYaw } from '../src/systems/camera/ThirdPersonCamera';

describe('camera assistance', () => {
  it.each([
    [{ x: 0, z: -1 }, 0],
    [{ x: 1, z: 0 }, -Math.PI / 2],
    [{ x: 0, z: 1 }, -Math.PI],
    [{ x: -1, z: 0 }, Math.PI / 2],
  ])('calculates the behind-camera yaw for %o', (velocity, expected) => {
    expect(getAutoBehindTargetYaw(velocity)).toBeCloseTo(expected);
  });
});
