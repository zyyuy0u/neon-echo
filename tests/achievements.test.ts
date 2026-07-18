import { describe, expect, it, vi } from 'vitest';

import { AchievementEngine } from '../src/systems/achievements/AchievementEngine';
import { ACHIEVEMENTS } from '../src/systems/achievements/definitions';

describe('achievement engine', () => {
  it('unlocks count thresholds and does not unlock twice', () => {
    const onUnlock = vi.fn();
    const engine = new AchievementEngine([], onUnlock);

    expect(
      engine.handle({ type: 'count', metric: 'shards', value: 1 }),
    ).toHaveLength(1);
    expect(engine.getUnlockedIds()).toContain('first-shard');

    engine.handle({ type: 'count', metric: 'shards', value: 1 });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('unlocks one-time event achievements', () => {
    const engine = new AchievementEngine();

    engine.handle({ type: 'warp' });
    engine.handle({ type: 'sanctuary', id: 'pulseTrack' });
    engine.handle({ type: 'ending', choice: 'awaken' });

    expect(engine.getUnlockedIds()).toEqual(
      expect.arrayContaining([
        'first-warp',
        'sanctuary-pulse-track',
        'ending-awaken',
      ]),
    );
  });

  it('unlocks accumulated playtime at thirty minutes', () => {
    const engine = new AchievementEngine();

    engine.handle({
      type: 'count',
      metric: 'playtimeSeconds',
      value: 1799.9,
    });
    expect(engine.getUnlockedIds()).not.toContain('playtime-30-minutes');

    engine.handle({
      type: 'count',
      metric: 'playtimeSeconds',
      value: 1800,
    });
    expect(engine.getUnlockedIds()).toContain('playtime-30-minutes');
  });

  it('restores unlocked ids without replaying unlock effects', () => {
    const onUnlock = vi.fn();
    const engine = new AchievementEngine(['first-shard'], onUnlock);

    expect(engine.isUnlocked('first-shard')).toBe(true);
    expect(onUnlock).not.toHaveBeenCalled();
    expect(new Set(ACHIEVEMENTS.map(({ id }) => id)).size).toBe(
      ACHIEVEMENTS.length,
    );
  });
});

