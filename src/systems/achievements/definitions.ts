import type { EndingChoice } from '../ending/EndingState';
import type { PuzzleId } from '../puzzles/PuzzleState';

export type AchievementMetric =
  | 'shards'
  | 'steles'
  | 'abilities'
  | 'playtimeSeconds';

export type AchievementCondition =
  | { type: 'count'; metric: AchievementMetric; threshold: number }
  | { type: 'sanctuary'; id: PuzzleId }
  | { type: 'warp' }
  | { type: 'ending'; choice: EndingChoice };

export interface AchievementDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  hidden: boolean;
  condition: AchievementCondition;
}

export const ACHIEVEMENT_PROGRESS_TOTAL = 12;

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first-shard',
    titleKey: 'achievement.firstShard.title',
    descriptionKey: 'achievement.firstShard.description',
    hidden: false,
    condition: { type: 'count', metric: 'shards', threshold: 1 },
  },
  {
    id: 'shards-10',
    titleKey: 'achievement.shards10.title',
    descriptionKey: 'achievement.shards10.description',
    hidden: false,
    condition: { type: 'count', metric: 'shards', threshold: 10 },
  },
  {
    id: 'shards-25',
    titleKey: 'achievement.shards25.title',
    descriptionKey: 'achievement.shards25.description',
    hidden: false,
    condition: { type: 'count', metric: 'shards', threshold: 25 },
  },
  {
    id: 'shards-40',
    titleKey: 'achievement.shards40.title',
    descriptionKey: 'achievement.shards40.description',
    hidden: false,
    condition: { type: 'count', metric: 'shards', threshold: 40 },
  },
  {
    id: 'first-stele',
    titleKey: 'achievement.firstStele.title',
    descriptionKey: 'achievement.firstStele.description',
    hidden: false,
    condition: { type: 'count', metric: 'steles', threshold: 1 },
  },
  {
    id: 'all-steles',
    titleKey: 'achievement.allSteles.title',
    descriptionKey: 'achievement.allSteles.description',
    hidden: false,
    condition: { type: 'count', metric: 'steles', threshold: 12 },
  },
  {
    id: 'sanctuary-pulse-track',
    titleKey: 'achievement.sanctuary1.title',
    descriptionKey: 'achievement.sanctuary1.description',
    hidden: false,
    condition: { type: 'sanctuary', id: 'pulseTrack' },
  },
  {
    id: 'sanctuary-light-bridge',
    titleKey: 'achievement.sanctuary2.title',
    descriptionKey: 'achievement.sanctuary2.description',
    hidden: false,
    condition: { type: 'sanctuary', id: 'lightBridge' },
  },
  {
    id: 'sanctuary-wind-well',
    titleKey: 'achievement.sanctuary3.title',
    descriptionKey: 'achievement.sanctuary3.description',
    hidden: false,
    condition: { type: 'sanctuary', id: 'windWell' },
  },
  {
    id: 'first-warp',
    titleKey: 'achievement.firstWarp.title',
    descriptionKey: 'achievement.firstWarp.description',
    hidden: false,
    condition: { type: 'warp' },
  },
  {
    id: 'ending-awaken',
    titleKey: 'achievement.endingAwaken.title',
    descriptionKey: 'achievement.endingAwaken.description',
    hidden: true,
    condition: { type: 'ending', choice: 'awaken' },
  },
  {
    id: 'ending-rest',
    titleKey: 'achievement.endingRest.title',
    descriptionKey: 'achievement.endingRest.description',
    hidden: true,
    condition: { type: 'ending', choice: 'rest' },
  },
  {
    id: 'all-abilities',
    titleKey: 'achievement.allAbilities.title',
    descriptionKey: 'achievement.allAbilities.description',
    hidden: true,
    condition: { type: 'count', metric: 'abilities', threshold: 3 },
  },
  {
    id: 'playtime-30-minutes',
    titleKey: 'achievement.playtime30.title',
    descriptionKey: 'achievement.playtime30.description',
    hidden: false,
    condition: {
      type: 'count',
      metric: 'playtimeSeconds',
      threshold: 30 * 60,
    },
  },
];

