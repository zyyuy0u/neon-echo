import { describe, expect, it } from 'vitest';

import {
  formatCompassDistance,
  projectCompassBearing,
} from '../src/systems/compass/projection';

describe('compass projection', () => {
  it('centers north while the player faces north', () => {
    expect(projectCompassBearing(0, 0)).toMatchObject({
      visible: true,
      positionPercent: 50,
      opacity: 1,
      relativeDegrees: 0,
    });
  });

  it('hides a target directly behind the player', () => {
    expect(projectCompassBearing(0, Math.PI).visible).toBe(false);
  });

  it.each([
    [-110, 0],
    [110, 100],
  ])('fades the %d degree boundary at the %d%% edge', (degrees, edge) => {
    const projection = projectCompassBearing(0, (degrees * Math.PI) / 180);
    expect(projection.visible).toBe(true);
    expect(projection.positionPercent).toBeCloseTo(edge);
    expect(projection.opacity).toBe(0);
  });

  it.each([
    [999, '999m'],
    [1500, '1.5km'],
  ])('formats %d metres as %s', (distance, formatted) => {
    expect(formatCompassDistance(distance)).toBe(formatted);
  });
});
