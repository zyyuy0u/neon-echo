import type { EndingChoice } from './EndingState';

export interface EndingAnimationConfig {
  waveCount: number;
  durationSeconds: number;
}

export function getEndingAnimationConfig(
  reducedMotion: boolean,
): EndingAnimationConfig {
  return reducedMotion
    ? { waveCount: 2, durationSeconds: 1.5 }
    : { waveCount: 4, durationSeconds: 4 };
}

export function getDistanceWaveIndex(
  distance: number,
  maximumDistance: number,
  waveCount = 4,
): number {
  const count = Math.max(1, Math.floor(waveCount));
  const maximum = Math.max(Number.EPSILON, maximumDistance);
  const normalized = Math.min(1, Math.max(0, distance / maximum));
  return Math.min(count - 1, Math.floor(normalized * count));
}

export function getEndingWaveIndex(
  choice: EndingChoice,
  distance: number,
  maximumDistance: number,
  waveCount = 4,
): number {
  const nearToFar = getDistanceWaveIndex(distance, maximumDistance, waveCount);
  return choice === 'awaken' ? nearToFar : waveCount - 1 - nearToFar;
}

