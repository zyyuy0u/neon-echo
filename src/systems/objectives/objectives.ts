import type { Ability } from '../../world/map/types';
import type { EndingChoice } from '../ending/EndingState';
import type { PuzzleId, PuzzleSnapshot } from '../puzzles/PuzzleState';

export type ObjectiveId =
  | 'sanctuary-1'
  | 'sanctuary-2'
  | 'sanctuary-3'
  | 'core-requirements'
  | 'ending';

export interface ObjectiveDefinition {
  id: ObjectiveId;
  labelKey: string;
  targetId: string;
  puzzleId?: PuzzleId;
  minimumShards?: number;
  requiredAbilities?: readonly Ability[];
}

export interface ObjectiveProgress {
  puzzles: Readonly<Record<PuzzleId, PuzzleSnapshot>>;
  abilities: readonly Ability[];
  shardCount: number;
  endingChoice: EndingChoice | null;
}

const ALL_ABILITIES: readonly Ability[] = ['dash', 'doubleJump', 'glide'];

/** Ordered, immutable campaign data. The final node intentionally remains current. */
export const OBJECTIVE_CHAIN: readonly ObjectiveDefinition[] = [
  {
    id: 'sanctuary-1',
    labelKey: 'objective.sanctuary1',
    targetId: 'compass-sanctuary-dash',
    puzzleId: 'pulseTrack',
  },
  {
    id: 'sanctuary-2',
    labelKey: 'objective.sanctuary2',
    targetId: 'compass-sanctuary-double-jump',
    puzzleId: 'lightBridge',
  },
  {
    id: 'sanctuary-3',
    labelKey: 'objective.sanctuary3',
    targetId: 'compass-sanctuary-glide',
    puzzleId: 'windWell',
  },
  {
    id: 'core-requirements',
    labelKey: 'objective.coreRequirements',
    targetId: 'landmark-chasm',
    minimumShards: 30,
    requiredAbilities: ALL_ABILITIES,
  },
  {
    id: 'ending',
    labelKey: 'objective.ending',
    targetId: 'landmark-chasm',
  },
] as const;

export function isObjectiveComplete(
  objective: ObjectiveDefinition,
  progress: ObjectiveProgress,
): boolean {
  if (objective.id === 'ending') return false;
  if (objective.puzzleId) {
    return progress.puzzles[objective.puzzleId].altarActivated;
  }
  const owned = new Set(progress.abilities);
  return (
    progress.shardCount >= (objective.minimumShards ?? 0) &&
    (objective.requiredAbilities ?? []).every((ability) => owned.has(ability))
  );
}

/** Returns the earliest unfinished node; completing all gates advances to ending. */
export function getAutomaticObjective(
  progress: ObjectiveProgress,
): ObjectiveDefinition {
  return (
    OBJECTIVE_CHAIN.find(
      (objective) => !isObjectiveComplete(objective, progress),
    ) ?? OBJECTIVE_CHAIN[OBJECTIVE_CHAIN.length - 1]!
  );
}
