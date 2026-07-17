import { describe, expect, it, vi } from 'vitest';

import { GameLoop, type FrameScheduler } from '../src/core/GameLoop';

class ManualFrameScheduler implements FrameScheduler {
  private callback: FrameRequestCallback | undefined;

  public request(callback: FrameRequestCallback): number {
    this.callback = callback;
    return 1;
  }

  public cancel(): void {
    this.callback = undefined;
  }

  public advance(timeMilliseconds: number): void {
    const callback = this.callback;
    if (!callback) throw new Error('No animation frame is scheduled.');
    this.callback = undefined;
    callback(timeMilliseconds);
  }
}

describe('GameLoop', () => {
  it('runs fixed updates and passes the remaining fraction to render', () => {
    const scheduler = new ManualFrameScheduler();
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop({ update, render }, 0.01, scheduler);

    loop.start();
    scheduler.advance(100);
    scheduler.advance(125);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenNthCalledWith(1, 0.01);
    expect(render.mock.lastCall?.[0]).toBeCloseTo(0.5);
    loop.stop();
  });
});
