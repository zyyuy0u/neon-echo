import { describe, expect, it } from 'vitest';

import { CollectibleState } from '../src/systems/collectibles/CollectibleState';

describe('collectible state', () => {
  it('collects the nearest in-range shard once and emits the count', () => {
    const state = new CollectibleState([
      { id: 'near', position: [1, 0, 0] },
      { id: 'far', position: [5, 0, 0] },
    ]);
    const counts: number[] = [];
    state.onCollect(({ count }) => counts.push(count));
    expect(state.collectNearest({ x: 0, y: 0, z: 0 }, 2)).toBe('near');
    expect(state.collectNearest({ x: 0, y: 0, z: 0 }, 2)).toBeUndefined();
    expect(counts).toEqual([1]);
  });
});
