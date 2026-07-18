import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementMetric,
} from './definitions';
import type { EndingChoice } from '../ending/EndingState';
import type { PuzzleId } from '../puzzles/PuzzleState';

export type AchievementEvent =
  | { type: 'count'; metric: AchievementMetric; value: number }
  | { type: 'sanctuary'; id: PuzzleId }
  | { type: 'warp' }
  | { type: 'ending'; choice: EndingChoice };

export type AchievementUnlockListener = (
  definition: AchievementDefinition,
) => void;

function matches(
  definition: AchievementDefinition,
  event: AchievementEvent,
): boolean {
  const condition = definition.condition;
  if (condition.type === 'count' && event.type === 'count') {
    return (
      condition.metric === event.metric && event.value >= condition.threshold
    );
  }
  if (condition.type === 'sanctuary' && event.type === 'sanctuary') {
    return condition.id === event.id;
  }
  if (condition.type === 'ending' && event.type === 'ending') {
    return condition.choice === event.choice;
  }
  return condition.type === 'warp' && event.type === 'warp';
}

export class AchievementEngine {
  private readonly unlocked = new Set<string>();

  public constructor(
    unlockedIds: readonly string[] = [],
    private readonly onUnlock: AchievementUnlockListener = () => undefined,
  ) {
    this.restore(unlockedIds);
  }

  public handle(event: AchievementEvent): readonly AchievementDefinition[] {
    const newlyUnlocked: AchievementDefinition[] = [];
    for (const definition of ACHIEVEMENTS) {
      if (this.unlocked.has(definition.id) || !matches(definition, event)) {
        continue;
      }
      this.unlocked.add(definition.id);
      newlyUnlocked.push(definition);
      this.onUnlock(definition);
    }
    return newlyUnlocked;
  }

  public restore(unlockedIds: readonly string[]): void {
    const knownIds = new Set(ACHIEVEMENTS.map(({ id }) => id));
    this.unlocked.clear();
    for (const id of unlockedIds) {
      if (knownIds.has(id)) this.unlocked.add(id);
    }
  }

  public getUnlockedIds(): readonly string[] {
    return [...this.unlocked];
  }

  public isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }
}

