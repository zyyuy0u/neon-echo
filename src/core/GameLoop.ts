export interface GameLoopCallbacks {
  update: (fixedDeltaSeconds: number) => void;
  render: (interpolationAlpha: number) => void;
}

export interface FrameScheduler {
  request: (callback: FrameRequestCallback) => number;
  cancel: (handle: number) => void;
}

const browserFrameScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export class GameLoop {
  private accumulatorSeconds = 0;
  private frameHandle: number | null = null;
  private lastTimeMilliseconds: number | null = null;
  private running = false;

  public constructor(
    private readonly callbacks: GameLoopCallbacks,
    private readonly fixedDeltaSeconds = 1 / 60,
    private readonly scheduler: FrameScheduler = browserFrameScheduler,
    private readonly maximumFrameSeconds = 0.25,
  ) {
    if (fixedDeltaSeconds <= 0 || maximumFrameSeconds <= 0) {
      throw new RangeError('GameLoop timing values must be positive.');
    }
  }

  public start(): void {
    if (this.running) return;

    this.running = true;
    this.accumulatorSeconds = 0;
    this.lastTimeMilliseconds = null;
    this.frameHandle = this.scheduler.request(this.onFrame);
  }

  public stop(): void {
    this.running = false;
    if (this.frameHandle !== null) {
      this.scheduler.cancel(this.frameHandle);
      this.frameHandle = null;
    }
  }

  private readonly onFrame: FrameRequestCallback = (timeMilliseconds) => {
    if (!this.running) return;

    if (this.lastTimeMilliseconds === null) {
      this.lastTimeMilliseconds = timeMilliseconds;
    } else {
      const elapsedSeconds = Math.min(
        Math.max((timeMilliseconds - this.lastTimeMilliseconds) / 1000, 0),
        this.maximumFrameSeconds,
      );
      this.lastTimeMilliseconds = timeMilliseconds;
      this.accumulatorSeconds += elapsedSeconds;

      while (this.accumulatorSeconds >= this.fixedDeltaSeconds) {
        this.callbacks.update(this.fixedDeltaSeconds);
        this.accumulatorSeconds -= this.fixedDeltaSeconds;
      }
    }

    this.callbacks.render(this.accumulatorSeconds / this.fixedDeltaSeconds);
    this.frameHandle = this.scheduler.request(this.onFrame);
  };
}
