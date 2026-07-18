export const DAY_CYCLE_SECONDS = 12 * 60;

export interface DayMood {
  zenith: string;
  rose: string;
  horizon: string;
  fog: string;
  sunIntensity: number;
  ambientIntensity: number;
}

export const SUNSET_MOOD: Readonly<DayMood> = {
  zenith: '#1a0b2e',
  rose: '#c73866',
  horizon: '#ff6b35',
  fog: '#1a0b2e',
  sunIntensity: 1,
  ambientIntensity: 2.1,
};

export const MIDNIGHT_MOOD: Readonly<DayMood> = {
  zenith: '#080518',
  rose: '#4f1b68',
  horizon: '#16213e',
  fog: '#0d0924',
  sunIntensity: 0.38,
  ambientIntensity: 1.25,
};

export function normalizeDayPhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0;
  return ((phase % 1) + 1) % 1;
}

export function advanceDayPhase(
  phase: number,
  elapsedSeconds: number,
): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return normalizeDayPhase(phase);
  }
  return normalizeDayPhase(phase + elapsedSeconds / DAY_CYCLE_SECONDS);
}

function hexToRgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

function interpolateHex(from: string, to: string, amount: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  return `#${start
    .map((component, index) => {
      const target = end[index] ?? component;
      return toHex(component + (target - component) * amount);
    })
    .join('')}`;
}

/**
 * A cosine synthesis wave keeps both the sunset and midnight turnarounds
 * smooth: phase 0/1 is sunset and phase 0.5 is the deepest blue-violet night.
 */
export function getDayMood(phase: number): DayMood {
  const normalized = normalizeDayPhase(phase);
  const midnightBlend = (1 - Math.cos(normalized * Math.PI * 2)) / 2;
  return {
    zenith: interpolateHex(
      SUNSET_MOOD.zenith,
      MIDNIGHT_MOOD.zenith,
      midnightBlend,
    ),
    rose: interpolateHex(
      SUNSET_MOOD.rose,
      MIDNIGHT_MOOD.rose,
      midnightBlend,
    ),
    horizon: interpolateHex(
      SUNSET_MOOD.horizon,
      MIDNIGHT_MOOD.horizon,
      midnightBlend,
    ),
    fog: interpolateHex(
      SUNSET_MOOD.fog,
      MIDNIGHT_MOOD.fog,
      midnightBlend,
    ),
    sunIntensity:
      SUNSET_MOOD.sunIntensity +
      (MIDNIGHT_MOOD.sunIntensity - SUNSET_MOOD.sunIntensity) * midnightBlend,
    ambientIntensity:
      SUNSET_MOOD.ambientIntensity +
      (MIDNIGHT_MOOD.ambientIntensity - SUNSET_MOOD.ambientIntensity) *
        midnightBlend,
  };
}

