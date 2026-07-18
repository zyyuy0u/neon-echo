import { describe, expect, it } from 'vitest';

import {
  getDayMood,
  MIDNIGHT_MOOD,
  SUNSET_MOOD,
} from '../src/systems/mood/dayCycle';

function rgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

describe('synthwave day mood', () => {
  it('uses the current sunset at phase 0 and deep night at phase 0.5', () => {
    expect(getDayMood(0)).toEqual({
      zenith: '#1a0b2e',
      rose: '#c73866',
      horizon: '#ff6b35',
      fog: '#1a0b2e',
      sunIntensity: 1,
      ambientIntensity: 2.1,
    });
    expect(getDayMood(0.5)).toEqual({
      zenith: '#080518',
      rose: '#4f1b68',
      horizon: '#16213e',
      fog: '#0d0924',
      sunIntensity: 0.38,
      ambientIntensity: 1.25,
    });
  });

  it('keeps every sampled phase inside the sunset-to-night RGB gamut', () => {
    const colorKeys = ['zenith', 'rose', 'horizon', 'fog'] as const;
    for (let sample = 0; sample <= 720; sample += 1) {
      const mood = getDayMood(sample / 720);
      for (const key of colorKeys) {
        const actual = rgb(mood[key]);
        const sunset = rgb(SUNSET_MOOD[key]);
        const midnight = rgb(MIDNIGHT_MOOD[key]);
        actual.forEach((component, index) => {
          expect(component).toBeGreaterThanOrEqual(
            Math.min(sunset[index]!, midnight[index]!),
          );
          expect(component).toBeLessThanOrEqual(
            Math.max(sunset[index]!, midnight[index]!),
          );
        });
      }
    }
  });
});
