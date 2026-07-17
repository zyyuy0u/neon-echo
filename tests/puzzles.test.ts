import { describe, expect, it } from 'vitest';

import { AbilityState } from '../src/systems/abilities/AbilityState';
import {
  LightBridgePuzzle,
  PulseTrackPuzzle,
  PuzzleState,
  WindWellPuzzle,
} from '../src/systems/puzzles/PuzzleState';

describe('sanctuary puzzle state machines', () => {
  it('resets the light bridge on a wrong order and completes the right order', () => {
    const bridge = new LightBridgePuzzle();
    bridge.stepOn(0);
    expect(bridge.stepOn(2)).toBe(false);
    expect(bridge.activatedSwitches).toBe(0);
    expect([0, 1, 2].every((step) => bridge.stepOn(step))).toBe(true);
    expect(bridge.completed).toBe(true);
  });

  it('provides a passable pulse window for all four sequential segments', () => {
    const pulse = new PulseTrackPuzzle();
    expect(pulse.visit(0, 0)).toBe(true);
    expect(pulse.visit(1, 1)).toBe(true);
    expect(pulse.visit(2, 2)).toBe(true);
    expect(pulse.visit(3, 3)).toBe(true);
    expect(pulse.completed).toBe(true);
  });

  it('completes the wind well only upon reaching the top', () => {
    const wind = new WindWellPuzzle();
    expect(wind.reachHeight(19.9, 20)).toBe(false);
    expect(wind.reachHeight(20, 20)).toBe(true);
  });

  it.each([
    ['pulseTrack', 'dash'],
    ['lightBridge', 'doubleJump'],
    ['windWell', 'glide'],
  ] as const)('emits %s altar unlock payload %s', (puzzleId, ability) => {
    const abilities = new AbilityState();
    const state = new PuzzleState(abilities);
    const events: string[] = [];
    abilities.onUnlock((event) => events.push(event.ability));
    if (puzzleId === 'pulseTrack') state.pulseTrack.completed = true;
    if (puzzleId === 'lightBridge') state.lightBridge.completed = true;
    if (puzzleId === 'windWell') state.windWell.completed = true;
    expect(state.activateAltar(puzzleId)).toBe(true);
    expect(events).toEqual([ability]);
  });
});
