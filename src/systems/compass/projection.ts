export const COMPASS_HALF_VIEW_DEGREES = 110;
const EDGE_FADE_DEGREES = 20;

export interface CompassProjection {
  visible: boolean;
  positionPercent: number;
  opacity: number;
  relativeDegrees: number;
}

function normalizeRadians(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function getBearing(
  origin: Readonly<{ x: number; z: number }>,
  target: Readonly<{ x: number; z: number }>,
): number {
  return Math.atan2(target.x - origin.x, target.z - origin.z);
}

export function projectCompassBearing(
  playerHeading: number,
  targetBearing: number,
  halfViewDegrees = COMPASS_HALF_VIEW_DEGREES,
): CompassProjection {
  const relativeDegrees =
    (normalizeRadians(targetBearing - playerHeading) * 180) / Math.PI;
  const absoluteDegrees = Math.abs(relativeDegrees);
  const visible = absoluteDegrees <= halfViewDegrees;
  const fadeStart = Math.max(0, halfViewDegrees - EDGE_FADE_DEGREES);
  const opacity = visible
    ? Math.min(
        1,
        Math.max(0, (halfViewDegrees - absoluteDegrees) / EDGE_FADE_DEGREES),
      )
    : 0;
  return {
    visible,
    positionPercent:
      50 +
      (Math.min(halfViewDegrees, Math.max(-halfViewDegrees, relativeDegrees)) /
        halfViewDegrees) *
        50,
    opacity: absoluteDegrees <= fadeStart ? 1 : opacity,
    relativeDegrees,
  };
}

export function formatCompassDistance(distanceMeters: number): string {
  const distance = Math.max(
    0,
    Number.isFinite(distanceMeters) ? distanceMeters : 0,
  );
  if (distance > 1000) return `${(distance / 1000).toFixed(1)}km`;
  return `${Math.round(distance)}m`;
}
