import { describe, expect, it, vi } from 'vitest';

import {
  AUDIO_EVENT_HANDLERS,
  AUDIO_EVENTS,
  AudioSystem,
  getFootstepPhaseCrossings,
  getLandingSoundTier,
} from '../src/systems/audio/AudioSystem';

interface FakeAudioContextResult {
  context: AudioContext;
  scheduled: () => number;
}

function createAudioParam(initial = 0): AudioParam {
  const parameter = {
    value: initial,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(function (this: { value: number }, value: number) {
      this.value = value;
      return this;
    }),
    linearRampToValueAtTime: vi.fn(function (
      this: { value: number },
      value: number,
    ) {
      this.value = value;
      return this;
    }),
    exponentialRampToValueAtTime: vi.fn(function (
      this: { value: number },
      value: number,
    ) {
      this.value = value;
      return this;
    }),
  };
  return parameter as unknown as AudioParam;
}

function createFakeContext(): FakeAudioContextResult {
  let scheduled = 0;
  const connectable = () => ({ connect: vi.fn() });
  const context = {
    currentTime: 0,
    state: 'running',
    destination: connectable(),
    createGain: () => ({ ...connectable(), gain: createAudioParam(1) }),
    createBiquadFilter: () => ({
      ...connectable(),
      type: 'lowpass',
      frequency: createAudioParam(350),
    }),
    createOscillator: () => ({
      ...connectable(),
      type: 'sine',
      frequency: createAudioParam(440),
      addEventListener: vi.fn(),
      start: () => {
        scheduled += 1;
      },
      stop: vi.fn(),
    }),
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  return {
    context: context as unknown as AudioContext,
    scheduled: () => scheduled,
  };
}

describe('procedural audio system', () => {
  it('selects landing sound tiers at the tuning threshold', () => {
    expect(getLandingSoundTier(9.9, 10)).toBe('soft');
    expect(getLandingSoundTier(10, 10)).toBe('hard');
    expect(getLandingSoundTier(-14, 10)).toBe('hard');
  });

  it('detects alternating Run clip foot phases including loop wrap', () => {
    expect(getFootstepPhaseCrossings(undefined, 0.2)).toBe(0);
    expect(getFootstepPhaseCrossings(0.1, 0.2)).toBe(1);
    expect(getFootstepPhaseCrossings(0.2, 0.7)).toBe(1);
    expect(getFootstepPhaseCrossings(0.9, 0.18)).toBe(1);
    expect(getFootstepPhaseCrossings(0.2, undefined)).toBe(0);
  });

  it('has a handler for every required gameplay event', () => {
    expect(Object.keys(AUDIO_EVENT_HANDLERS).sort()).toEqual(
      [...AUDIO_EVENTS].sort(),
    );
  });

  it('creates its AudioContext only after the gesture unlock entry point', () => {
    const fake = createFakeContext();
    const factory = vi.fn(() => fake.context);
    const audio = new AudioSystem(0.8, factory);

    expect(factory).not.toHaveBeenCalled();
    expect(audio.getState().initialized).toBe(false);

    audio.unlockFromGesture();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(audio.getState()).toMatchObject({
      initialized: true,
      volume: 0.8,
      respectsVolume: true,
    });
  });

  it('does not schedule sources while volume is zero', () => {
    const fake = createFakeContext();
    const audio = new AudioSystem(0, () => fake.context);
    audio.unlockFromGesture();

    for (const event of AUDIO_EVENTS) audio.play(event);
    audio.update(1 / 60, { x: 0, z: -100 });

    expect(fake.scheduled()).toBe(0);
  });
});
