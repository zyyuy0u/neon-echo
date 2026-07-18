import { describe, expect, it, vi } from 'vitest';

import {
  applyAxisDeadzone,
  detectButtonEdges,
  GamepadSystem,
  mapStickToVector,
  type GamepadLike,
} from '../src/systems/input/GamepadSystem';

function createGamepad(
  axes: readonly number[] = [0, 0, 0, 0],
  pressedButtons: readonly number[] = [],
): GamepadLike {
  return {
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressedButtons.includes(index),
      value: pressedButtons.includes(index) ? 1 : 0,
    })),
    connected: true,
    id: 'Test Standard Pad',
    index: 0,
    mapping: 'standard',
  };
}

describe('gamepad logic', () => {
  it('applies the deadzone and preserves analog stick magnitude', () => {
    expect(applyAxisDeadzone(0.1)).toBe(0);
    expect(applyAxisDeadzone(0.5)).toBeCloseTo((0.5 - 0.15) / 0.85);
    expect(mapStickToVector(0.1, 0)).toEqual({ x: 0, y: 0 });
    expect(mapStickToVector(0.5, 0)).toEqual({
      x: expect.closeTo((0.5 - 0.15) / 0.85),
      y: 0,
    });
  });

  it('reports a held button edge only once', () => {
    expect([...detectButtonEdges([], [true]).pressed]).toEqual([0]);
    expect([...detectButtonEdges([true], [true]).pressed]).toEqual([]);
    expect([...detectButtonEdges([true], [false]).released]).toEqual([0]);
  });

  it('polls injectable standard gamepad state for axes and button edges', () => {
    let gamepad: GamepadLike | null = createGamepad([0.5, -0.5, 0, 0], [0]);
    const connected = vi.fn();
    const disconnected = vi.fn();
    const system = new GamepadSystem(() => [gamepad], {
      onConnected: connected,
      onDisconnected: disconnected,
    });

    system.update();
    expect(system.getMovementAxes().x).toBeCloseTo(0.463);
    expect(system.getMovementAxes().y).toBeCloseTo(0.463);
    expect(system.wasActionPressed('jump')).toBe(true);
    expect(connected).toHaveBeenCalledWith('Test Standard Pad');

    system.endFixedStep();
    system.update();
    expect(system.wasActionPressed('jump')).toBe(false);

    gamepad = null;
    system.update();
    expect(disconnected).toHaveBeenCalledWith('Test Standard Pad');
  });
});
