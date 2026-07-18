import { describe, expect, it } from 'vitest';

import {
  clampMapTransform,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  projectWorldToMap,
} from '../src/ui/mapProjection';

describe('world map projection', () => {
  it('projects the world center and applies zoom plus pan', () => {
    const viewport = { width: 860, height: 860 };

    expect(
      projectWorldToMap({ x: 0, z: 0 }, viewport, {
        zoom: 1,
        panX: 0,
        panY: 0,
      }),
    ).toEqual({ x: 430, y: 430 });
    expect(
      projectWorldToMap({ x: 10, z: 20 }, viewport, {
        zoom: 2,
        panX: 30,
        panY: -15,
      }),
    ).toEqual({ x: 480, y: 455 });
  });

  it('clamps zoom and pan at both transform boundaries', () => {
    expect(
      clampMapTransform(
        { zoom: 99, panX: 999, panY: -999 },
        { width: 100, height: 200 },
      ),
    ).toEqual({ zoom: MAP_ZOOM_MAX, panX: 157.5, panY: -315 });
    expect(
      clampMapTransform(
        { zoom: 0.01, panX: -999, panY: 999 },
        { width: 100, height: 200 },
      ),
    ).toEqual({ zoom: MAP_ZOOM_MIN, panX: -29.25, panY: 58.5 });
  });

  it('uses bounded transforms when projecting out-of-range input', () => {
    const viewport = { width: 860, height: 860 };
    expect(
      projectWorldToMap({ x: 0, z: 0 }, viewport, {
        zoom: 10,
        panX: 10_000,
        panY: -10_000,
      }),
    ).toEqual({ x: 1784.5, y: -924.5 });
  });
});
