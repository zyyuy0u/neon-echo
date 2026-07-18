import { describe, expect, it } from 'vitest';

import {
  clampPhotoPosition,
  createPhotoFilename,
} from '../src/systems/photo/PhotoMode';

describe('photo mode helpers', () => {
  const bounds = { minX: -100, maxX: 200, minZ: -40, maxZ: 80 };

  it('clamps to world bounds plus fifty units and height 1–200', () => {
    expect(clampPhotoPosition({ x: -151, y: 0, z: 131 }, bounds)).toEqual({
      x: -150,
      y: 1,
      z: 130,
    });
    expect(clampPhotoPosition({ x: 251, y: 201, z: -91 }, bounds)).toEqual({
      x: 250,
      y: 200,
      z: -90,
    });
  });

  it('preserves exact boundary values', () => {
    expect(clampPhotoPosition({ x: -150, y: 1, z: 130 }, bounds)).toEqual({
      x: -150,
      y: 1,
      z: 130,
    });
  });

  it('creates the required timestamped PNG filename', () => {
    expect(createPhotoFilename(new Date(2026, 6, 18, 9, 5, 7))).toBe(
      'neon-echo-20260718-090507.png',
    );
  });
});

