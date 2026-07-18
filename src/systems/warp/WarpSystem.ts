import type { PuzzleId, PuzzleSnapshot } from '../puzzles/PuzzleState';
import type { Vector3Tuple, ZoneId } from '../../world/map/types';

export interface WarpAnchor {
  id: string;
  nameKey: string;
  zoneId: ZoneId;
  warpPoint: Vector3Tuple;
  puzzleId?: PuzzleId;
}

export type PuzzleSave = Readonly<Record<PuzzleId, PuzzleSnapshot>>;

export function isWarpUnlocked(
  anchor: WarpAnchor,
  puzzles: PuzzleSave,
): boolean {
  return anchor.puzzleId === undefined || puzzles[anchor.puzzleId].completed;
}
