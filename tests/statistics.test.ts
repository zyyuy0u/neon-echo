import { describe, expect, it } from 'vitest';

import {
  createDefaultStatistics,
  incrementStatistic,
  recordEnding,
} from '../src/systems/statistics/Statistics';

describe('statistics', () => {
  it('increments warp and photo counters without mutating the snapshot', () => {
    const initial = createDefaultStatistics();
    const afterWarp = incrementStatistic(initial, 'warpCount');
    const afterPhoto = incrementStatistic(afterWarp, 'photoCount');

    expect(initial).toEqual({ warpCount: 0, photoCount: 0, endings: [] });
    expect(afterPhoto).toEqual({
      warpCount: 1,
      photoCount: 1,
      endings: [],
    });
  });

  it('records each ending marker once', () => {
    const awakened = recordEnding(createDefaultStatistics(), 'awaken');
    const repeated = recordEnding(awakened, 'awaken');

    expect(repeated.endings).toEqual(['awaken']);
  });
});

