import { describe, expect, it } from 'vitest';

import {
  CITY_BUILDINGS,
  CITY_DECORATION_STATS,
  CITY_FLIGHT_PATHS,
} from '../src/world/CityVisuals';
import {
  generateFacadeWindowTexture,
  generateRoadTexture,
  generateSignTexture,
  ROAD_CENTER,
  WINDOW_CYAN,
  WINDOW_WARM,
} from '../src/world/cityTextures';

function pixelAt(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): readonly number[] {
  const offset = (y * width + x) * 4;
  return Array.from(pixels.slice(offset, offset + 4));
}

function hashPixels(pixels: Uint8ClampedArray): number {
  let hash = 2166136261;
  for (const value of pixels) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

describe('procedural city textures', () => {
  it('creates a deterministic 30–60% lit window matrix with warm and cyan tones', () => {
    const texture = generateFacadeWindowTexture(1986);
    const colors = Array.from({ length: texture.rows }, (_, row) =>
      Array.from({ length: texture.columns }, (_, column) =>
        pixelAt(
          texture.pixels,
          texture.width,
          Math.floor((column + 0.5) * (texture.width / texture.columns)),
          Math.floor((row + 0.5) * (texture.height / texture.rows)),
        ),
      ),
    ).flat();
    const warmCount = colors.filter(
      (color) => color.join(',') === WINDOW_WARM.join(','),
    ).length;
    const cyanCount = colors.filter(
      (color) => color.join(',') === WINDOW_CYAN.join(','),
    ).length;
    const litRatio = (warmCount + cyanCount) / colors.length;

    expect(generateFacadeWindowTexture(1986).pixels).toEqual(texture.pixels);
    expect(litRatio).toBeGreaterThanOrEqual(0.3);
    expect(litRatio).toBeLessThanOrEqual(0.6);
    expect(warmCount).toBeGreaterThan(0);
    expect(cyanCount).toBeGreaterThan(0);
  });

  it('keeps playable facade window cells within the reviewed density', () => {
    const texture = generateFacadeWindowTexture(1986);
    const widestFacade = Math.max(
      ...CITY_BUILDINGS.flatMap((building) => [building.width, building.depth]),
    );
    const tallestFacadeSection = Math.max(
      ...CITY_BUILDINGS.map((building) =>
        building.setback ? building.height * 0.68 : building.height,
      ),
    );

    // A cell includes its grey seam. On the largest playable facade, the
    // 0.9–1.4 unit width target requires at least ceil(22 / 1.4) = 16 columns;
    // the 1.2–1.8 unit floor target requires at least ceil(62 / 1.8) = 35 rows.
    const minimumColumns = Math.ceil(widestFacade / 1.4);
    const minimumRows = Math.ceil(tallestFacadeSection / 1.8);

    expect(texture.columns).toBeGreaterThanOrEqual(minimumColumns);
    expect(texture.rows).toBeGreaterThanOrEqual(minimumRows);
    expect(widestFacade / texture.columns).toBeGreaterThanOrEqual(0.9);
    expect(widestFacade / texture.columns).toBeLessThanOrEqual(1.4);
    expect(tallestFacadeSection / texture.rows).toBeGreaterThanOrEqual(1.2);
    expect(tallestFacadeSection / texture.rows).toBeLessThanOrEqual(1.8);
  });

  it('provides at least eight deterministic sign variations', () => {
    const hashes = Array.from({ length: 8 }, (_, seed) =>
      hashPixels(generateSignTexture(seed).pixels),
    );
    expect(new Set(hashes).size).toBe(8);
    expect(hashPixels(generateSignTexture(3).pixels)).toBe(hashes[3]);
  });

  it('draws the yellow dashed center line on the specified road row', () => {
    const road = generateRoadTexture(101);
    expect(pixelAt(road.pixels, road.width, road.width / 2, 8)).toEqual(
      ROAD_CENTER,
    );
    expect(pixelAt(road.pixels, road.width, 9, 120)).toEqual([
      0, 229, 255, 255,
    ]);
  });
});

describe('city decoration output', () => {
  it('meets every world decoration count threshold', () => {
    const buildingProfiles = new Set(
      CITY_BUILDINGS.map(
        (building) => `${building.width}x${building.depth}x${building.height}`,
      ),
    );
    expect(buildingProfiles.size).toBeGreaterThanOrEqual(6);
    expect(CITY_BUILDINGS.some((building) => building.setback)).toBe(true);
    expect(CITY_DECORATION_STATS.buildings).toBeGreaterThanOrEqual(6);
    expect(CITY_DECORATION_STATS.signs).toBeGreaterThanOrEqual(40);
    expect(CITY_DECORATION_STATS.streetlights).toBeGreaterThanOrEqual(60);
    expect(CITY_DECORATION_STATS.trafficSignals).toBeGreaterThanOrEqual(10);
    expect(CITY_DECORATION_STATS.benches).toBeGreaterThanOrEqual(20);
    expect(CITY_DECORATION_STATS.trashBins).toBeGreaterThanOrEqual(20);
    expect(CITY_DECORATION_STATS.skylineBuildings).toBeGreaterThanOrEqual(30);
    expect(CITY_FLIGHT_PATHS).toBeGreaterThanOrEqual(3);
    expect(CITY_FLIGHT_PATHS).toBeLessThanOrEqual(5);
  });
});
