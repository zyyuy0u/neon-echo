import type { ResolutionScale } from '../systems/save/SaveSystem';

export const MAX_DEVICE_PIXEL_RATIO = 2;

export function getRenderPixelRatio(
  devicePixelRatio: number,
  resolutionScale: ResolutionScale,
): number {
  const safeDeviceRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(0.1, devicePixelRatio)
    : 1;
  return Math.min(safeDeviceRatio, MAX_DEVICE_PIXEL_RATIO) * resolutionScale;
}
