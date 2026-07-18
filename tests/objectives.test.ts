import { describe, expect, it } from 'vitest';

import {
  ObjectiveTracker,
  resolveTrackedObjective,
} from '../src/systems/objectives/ObjectiveTracker';
import {
  getAutomaticObjective,
  type ObjectiveProgress,
} from '../src/systems/objectives/objectives';
import { createDefaultSaveData } from '../src/systems/save/SaveSystem';

function createProgress(): ObjectiveProgress {
  const save = createDefaultSaveData();
  return {
    puzzles: save.puzzles,
    abilities: save.abilities,
    shardCount: 0,
    endingChoice: null,
  };
}

describe('objective chain', () => {
  it('advances to the next node after every completed sanctuary', () => {
    const progress = createProgress();
    expect(getAutomaticObjective(progress).id).toBe('sanctuary-1');

    progress.puzzles.pulseTrack.altarActivated = true;
    expect(getAutomaticObjective(progress).id).toBe('sanctuary-2');

    progress.puzzles.lightBridge.altarActivated = true;
    expect(getAutomaticObjective(progress).id).toBe('sanctuary-3');

    progress.puzzles.windWell.altarActivated = true;
    expect(getAutomaticObjective(progress).id).toBe('core-requirements');
  });

  it('advances from the core requirements to the final ending objective', () => {
    const progress = createProgress();
    for (const puzzle of Object.values(progress.puzzles)) {
      puzzle.altarActivated = true;
    }
    progress.abilities = ['dash', 'doubleJump', 'glide'];
    progress.shardCount = 30;

    expect(getAutomaticObjective(progress).id).toBe('ending');
  });

  it('lets a custom target override the chain and cancel back to automatic', () => {
    const progress = createProgress();
    const tracker = new ObjectiveTracker();
    const findTarget = (id: string) =>
      id === 'landmark-ring'
        ? { id, labelKey: 'compass.landmark.ring' }
        : undefined;

    tracker.setCustomTarget('landmark-ring');
    expect(
      resolveTrackedObjective(progress, tracker.getSnapshot(), findTarget),
    ).toMatchObject({
      id: 'custom:landmark-ring',
      targetId: 'landmark-ring',
      mode: 'custom',
    });

    tracker.setCustomTarget(null);
    expect(
      resolveTrackedObjective(progress, tracker.getSnapshot(), findTarget),
    ).toMatchObject({ id: 'sanctuary-1', mode: 'automatic' });
  });
});
