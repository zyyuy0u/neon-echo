export interface MapTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export interface MapViewport {
  width: number;
  height: number;
}

export interface WorldMapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WORLD_MAP_BOUNDS: WorldMapBounds = {
  minX: -430,
  maxX: 430,
  minZ: -430,
  maxZ: 430,
};

export const MAP_ZOOM_MIN = 0.65;
export const MAP_ZOOM_MAX = 3.5;

export function clampMapTransform(
  transform: MapTransform,
  viewport: MapViewport,
): MapTransform {
  const zoom = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, transform.zoom));
  const maximumPanX = Math.max(0, viewport.width * 0.45 * zoom);
  const maximumPanY = Math.max(0, viewport.height * 0.45 * zoom);
  return {
    zoom,
    panX: Math.min(maximumPanX, Math.max(-maximumPanX, transform.panX)),
    panY: Math.min(maximumPanY, Math.max(-maximumPanY, transform.panY)),
  };
}

export function getWorldMapScale(
  viewport: MapViewport,
  bounds: WorldMapBounds = WORLD_MAP_BOUNDS,
): number {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  return Math.min(
    width / (bounds.maxX - bounds.minX),
    height / (bounds.maxZ - bounds.minZ),
  );
}

/** Pure world X/Z to map canvas projection, including bounded zoom and pan. */
export function projectWorldToMap(
  position: Readonly<{ x: number; z: number }>,
  viewport: MapViewport,
  transform: MapTransform,
  bounds: WorldMapBounds = WORLD_MAP_BOUNDS,
): { x: number; y: number } {
  const bounded = clampMapTransform(transform, viewport);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const scale = getWorldMapScale(viewport, bounds) * bounded.zoom;
  return {
    x: viewport.width / 2 + bounded.panX + (position.x - centerX) * scale,
    y: viewport.height / 2 + bounded.panY + (position.z - centerZ) * scale,
  };
}
