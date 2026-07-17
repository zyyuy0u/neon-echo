import { describe, expect, it } from 'vitest';

import { tuning } from '../src/core/tuning';
import { AbilityState } from '../src/systems/abilities/AbilityState';
import {
  createLocomotionState,
  stepLocomotion,
  type LocomotionInput,
  type LocomotionState,
} from '../src/systems/character/locomotion';

const dt = 1 / 60;
const idle = { x: 0, z: 0 };

function input(overrides: Partial<LocomotionInput> = {}): LocomotionInput {
  return {
    move: idle,
    grounded: false,
    jumpPressed: false,
    jumpHeld: false,
    jumpReleased: false,
    ...overrides,
  };
}

describe('ability state', () => {
  it('emits an unlock event once per ability', () => {
    const state = new AbilityState();
    const received: string[] = [];
    state.onUnlock(({ ability }) => received.push(ability));
    expect(state.unlock('dash')).toBe(true);
    expect(state.unlock('dash')).toBe(false);
    expect(received).toEqual(['dash']);
  });
});

describe('ability locomotion', () => {
  it('dashes at 20 m/s for 0.18s and rejects another dash during cooldown', () => {
    const abilities = new Set(['dash'] as const);
    let state = createLocomotionState();
    let result = stepLocomotion(
      state,
      input({
        move: { x: 1, z: 0 },
        grounded: true,
        dashPressed: true,
        abilities,
      }),
      dt,
    );
    expect(
      Math.hypot(result.state.velocity.x, result.state.velocity.z),
    ).toBeCloseTo(tuning.dashSpeed);
    expect(result.dashStarted).toBe(true);

    state = result.state;
    for (let elapsed = dt; elapsed < tuning.dashDuration + dt; elapsed += dt) {
      result = stepLocomotion(state, input({ grounded: true, abilities }), dt);
      state = result.state;
    }
    expect(Math.hypot(state.velocity.x, state.velocity.z)).toBeLessThan(
      tuning.dashSpeed,
    );
    result = stepLocomotion(
      state,
      input({ grounded: true, dashPressed: true, abilities }),
      dt,
    );
    expect(result.dashStarted).toBe(false);
  });

  it('allows only one double jump until landing resets it', () => {
    const abilities = new Set(['doubleJump'] as const);
    let state: LocomotionState = {
      ...createLocomotionState(),
      velocity: { x: 0, y: -1, z: 0 },
    };
    let result = stepLocomotion(
      state,
      input({ jumpPressed: true, jumpHeld: true, abilities }),
      dt,
    );
    expect(result.doubleJumped).toBe(true);
    state = result.state;
    result = stepLocomotion(
      state,
      input({ jumpPressed: true, jumpHeld: true, abilities }),
      dt,
    );
    expect(result.doubleJumped).toBe(false);
    state = stepLocomotion(
      state,
      input({ grounded: true, jumpPressed: true, jumpHeld: true, abilities }),
      dt,
    ).state;
    result = stepLocomotion(
      state,
      input({ jumpPressed: true, jumpHeld: true, abilities }),
      dt,
    );
    expect(result.doubleJumped).toBe(true);
  });

  it('clamps glide descent to 2.5 m/s and climbs in an updraft', () => {
    const abilities = new Set(['glide'] as const);
    const falling: LocomotionState = {
      ...createLocomotionState(),
      velocity: { x: 0, y: -12, z: 0 },
    };
    const glide = stepLocomotion(
      falling,
      input({ jumpHeld: true, abilities }),
      dt,
    );
    expect(glide.state.velocity.y).toBe(-tuning.glideFallSpeed);
    const updraft = stepLocomotion(
      falling,
      input({ jumpHeld: true, abilities, inUpdraft: true }),
      dt,
    );
    expect(updraft.state.velocity.y).toBe(tuning.updraftRiseSpeed);
  });

  it.each([
    ['dash', { dashPressed: true, move: { x: 1, z: 0 } }],
    ['double jump', { jumpPressed: true, jumpHeld: true }],
    ['glide', { jumpHeld: true }],
  ] as const)('ignores locked %s input', (_name, overrides) => {
    const state: LocomotionState = {
      ...createLocomotionState(),
      velocity: { x: 0, y: -12, z: 0 },
    };
    const result = stepLocomotion(state, input(overrides), dt);
    expect(result.dashStarted).toBe(false);
    expect(result.doubleJumped).toBe(false);
    expect(result.gliding).toBe(false);
  });
});
