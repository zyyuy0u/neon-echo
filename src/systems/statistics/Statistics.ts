import type { EndingChoice } from '../ending/EndingState';

export interface StatisticsSnapshot {
  warpCount: number;
  photoCount: number;
  endings: EndingChoice[];
}

export type CountedStatistic = 'warpCount' | 'photoCount';

export function createDefaultStatistics(): StatisticsSnapshot {
  return { warpCount: 0, photoCount: 0, endings: [] };
}

export function incrementStatistic(
  snapshot: Readonly<StatisticsSnapshot>,
  statistic: CountedStatistic,
): StatisticsSnapshot {
  return {
    ...snapshot,
    endings: [...snapshot.endings],
    [statistic]: Math.max(0, snapshot[statistic]) + 1,
  };
}

export function recordEnding(
  snapshot: Readonly<StatisticsSnapshot>,
  choice: EndingChoice,
): StatisticsSnapshot {
  if (snapshot.endings.includes(choice)) {
    return { ...snapshot, endings: [...snapshot.endings] };
  }
  return { ...snapshot, endings: [...snapshot.endings, choice] };
}

