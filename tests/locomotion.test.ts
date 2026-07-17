import { describe, expect, it } from 'vitest';

import { tuning } from '../src/core/tuning';
import {
  createLocomotionState,
  stepLocomotion,
  type LocomotionState,
} from '../src/systems/character/locomotion';

const fixedDelta = 1 / 60;
const idleMove = { x: 0, z: 0 };

function groundedState(): LocomotionState {
  return stepLocomotion(
    createLocomotionState(),
    {
      move: idleMove,
      grounded: true,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false,
    },
    fixedDelta,
  ).state;
}

function waitInAir(state: LocomotionState, steps: number): LocomotionState {
  let next = state;
  for (let index = 0; index < steps; index += 1) {
    next = stepLocomotion(
      next,
      {
        move: idleMove,
        grounded: false,
        jumpPressed: false,
        jumpHeld: true,
        jumpReleased: false,
      },
      fixedDelta,
    ).state;
  }
  return next;
}

describe('locomotion', () => {
  it('allows a coyote jump before 120ms but rejects one after 120ms', () => {
    const withinWindow = waitInAir(groundedState(), 6);
    const accepted = stepLocomotion(
      withinWindow,
      {
        move: idleMove,
        grounded: false,
        jumpPressed: true,
        jumpHeld: true,
        jumpReleased: false,
      },
      fixedDelta,
    );
    expect(accepted.jumped).toBe(true);

    const outsideWindow = waitInAir(groundedState(), 8);
    const rejected = stepLocomotion(
      outsideWindow,
      {
        move: idleMove,
        grounded: false,
        jumpPressed: true,
        jumpHeld: true,
        jumpReleased: false,
      },
      fixedDelta,
    );
    expect(rejected.jumped).toBe(false);
  });

  it('buffers a jump pressed less than 100ms before landing', () => {
    let state: LocomotionState = {
      ...createLocomotionState(),
      velocity: { x: 0, y: -1, z: 0 },
    };
    state = stepLocomotion(
      state,
      {
        move: idleMove,
        grounded: false,
        jumpPressed: true,
        jumpHeld: true,
        jumpReleased: false,
      },
      fixedDelta,
    ).state;
    state = waitInAir(state, 3);

    const landed = stepLocomotion(
      state,
      {
        move: idleMove,
        grounded: true,
        jumpPressed: false,
        jumpHeld: true,
        jumpReleased: false,
      },
      fixedDelta,
    );
    expect(landed.jumped).toBe(true);
    expect(landed.state.velocity.y).toBeGreaterThan(0);
  });

  it('produces a lower peak when jump is released early', () => {
    const simulatePeak = (releaseStep: number | undefined): number => {
      let state = stepLocomotion(
        groundedState(),
        {
          move: idleMove,
          grounded: true,
          jumpPressed: true,
          jumpHeld: true,
          jumpReleased: false,
        },
        fixedDelta,
      ).state;
      let height = 0;
      let peak = 0;

      for (let step = 0; step < 180; step += 1) {
        const released = step === releaseStep;
        state = stepLocomotion(
          state,
          {
            move: idleMove,
            grounded: false,
            jumpPressed: false,
            jumpHeld: releaseStep === undefined || step < releaseStep,
            jumpReleased: released,
          },
          fixedDelta,
        ).state;
        height += state.velocity.y * fixedDelta;
        peak = Math.max(peak, height);
        if (state.velocity.y < 0 && height <= 0) break;
      }
      return peak;
    };

    expect(simulatePeak(3)).toBeLessThan(simulatePeak(undefined));
  });

  it('accelerates from rest to full ground speed at the tuning time', () => {
    let state = createLocomotionState();
    let elapsed = 0;
    while (state.velocity.x < tuning.runSpeed && elapsed < 1) {
      state = stepLocomotion(
        state,
        {
          move: { x: 1, z: 0 },
          grounded: true,
          jumpPressed: false,
          jumpHeld: false,
          jumpReleased: false,
        },
        fixedDelta,
      ).state;
      elapsed += fixedDelta;
    }

    expect(state.velocity.x).toBe(tuning.runSpeed);
    expect(
      Math.abs(elapsed - tuning.groundAccelerationTime),
    ).toBeLessThanOrEqual(fixedDelta);
  });
});
