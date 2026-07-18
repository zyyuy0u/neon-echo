import { describe, expect, it } from 'vitest';

import { createDefaultSaveData } from '../src/systems/save/SaveSystem';
import { WARP_ANCHORS } from '../src/systems/warp/anchors';
import { isWarpUnlocked } from '../src/systems/warp/WarpSystem';

describe('warp eligibility', () => {
  it('always unlocks Stasis Plaza', () => {
    const save = createDefaultSaveData();
    const plaza = WARP_ANCHORS.find((anchor) => anchor.id === 'warp-plaza');
    expect(plaza).toBeDefined();
    expect(isWarpUnlocked(plaza!, save.puzzles)).toBe(true);
  });

  it('unlocks a sanctuary only after its puzzle is complete', () => {
    const save = createDefaultSaveData();
    const south = WARP_ANCHORS.find((anchor) => anchor.id === 'warp-skylift');
    expect(south).toBeDefined();
    expect(isWarpUnlocked(south!, save.puzzles)).toBe(false);

    save.puzzles.pulseTrack.completed = true;
    expect(isWarpUnlocked(south!, save.puzzles)).toBe(true);
  });
});
