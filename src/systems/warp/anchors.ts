import { WORLD_ZONES } from '../../world/map/graph';
import type { PuzzleId } from '../puzzles/PuzzleState';
import type { WarpAnchor } from './WarpSystem';

const PUZZLE_BY_SANCTUARY: Readonly<Record<string, PuzzleId>> = {
  'sanctuary-dash': 'pulseTrack',
  'sanctuary-double-jump': 'lightBridge',
  'sanctuary-glide': 'windWell',
};

export const WARP_ANCHORS: readonly WarpAnchor[] = WORLD_ZONES.flatMap(
  (zone): WarpAnchor[] => {
    if (!zone.warpPoint) return [];
    if (zone.id === 'plaza') {
      return [
        {
          id: 'warp-plaza',
          nameKey: 'warp.anchor.plaza',
          zoneId: zone.id,
          warpPoint: zone.warpPoint,
        },
      ];
    }
    if (!zone.sanctuary) return [];
    const puzzleId = PUZZLE_BY_SANCTUARY[zone.sanctuary.id];
    if (!puzzleId) return [];
    return [
      {
        id: `warp-${zone.id}`,
        nameKey: `warp.anchor.${zone.id}`,
        zoneId: zone.id,
        warpPoint: zone.warpPoint,
        puzzleId,
      },
    ];
  },
);
