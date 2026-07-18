import { tuning } from '../../core/tuning';

export const AUDIO_EVENTS = [
  'jump',
  'doubleJump',
  'dash',
  'shardPickup',
  'steleOpen',
  'puzzleProgress',
  'puzzleComplete',
  'abilityUnlock',
  'shrineFanfare',
  'uiMove',
  'uiConfirm',
  'uiBack',
  'shardTick',
  'steleBlip',
  'endingTrigger',
] as const;

export type AudioEvent = (typeof AUDIO_EVENTS)[number];
export type MusicZone = 'south' | 'east' | 'west' | 'north';
export type AudioContextFactory = () => AudioContext;

export interface AudioEventOptions {
  streak?: number;
  ending?: 'awaken' | 'rest';
}

export interface AudioState {
  initialized: boolean;
  volume: number;
  respectsVolume: boolean;
  zone: MusicZone;
}

interface Tone {
  frequency: number;
  endFrequency: number;
  duration: number;
  gain: number;
  wave: OscillatorType;
}

const TONES: Readonly<Record<AudioEvent, Tone>> = {
  jump: {
    frequency: 180,
    endFrequency: 310,
    duration: 0.16,
    gain: 0.13,
    wave: 'sine',
  },
  doubleJump: {
    frequency: 280,
    endFrequency: 560,
    duration: 0.22,
    gain: 0.15,
    wave: 'triangle',
  },
  dash: {
    frequency: 150,
    endFrequency: 58,
    duration: 0.2,
    gain: 0.16,
    wave: 'sawtooth',
  },
  shardPickup: {
    frequency: 520,
    endFrequency: 760,
    duration: 0.16,
    gain: 0.12,
    wave: 'sine',
  },
  steleOpen: {
    frequency: 132,
    endFrequency: 198,
    duration: 0.7,
    gain: 0.1,
    wave: 'triangle',
  },
  puzzleProgress: {
    frequency: 330,
    endFrequency: 392,
    duration: 0.18,
    gain: 0.1,
    wave: 'square',
  },
  puzzleComplete: {
    frequency: 392,
    endFrequency: 784,
    duration: 0.55,
    gain: 0.14,
    wave: 'triangle',
  },
  abilityUnlock: {
    frequency: 262,
    endFrequency: 1047,
    duration: 0.75,
    gain: 0.15,
    wave: 'sine',
  },
  shrineFanfare: {
    frequency: 293.66,
    endFrequency: 1174.66,
    duration: 0.62,
    gain: 0.15,
    wave: 'sine',
  },
  uiMove: {
    frequency: 660,
    endFrequency: 720,
    duration: 0.055,
    gain: 0.055,
    wave: 'sine',
  },
  uiConfirm: {
    frequency: 440,
    endFrequency: 660,
    duration: 0.12,
    gain: 0.075,
    wave: 'triangle',
  },
  uiBack: {
    frequency: 550,
    endFrequency: 330,
    duration: 0.12,
    gain: 0.07,
    wave: 'triangle',
  },
  shardTick: {
    frequency: 880,
    endFrequency: 920,
    duration: 0.045,
    gain: 0.045,
    wave: 'sine',
  },
  steleBlip: {
    frequency: 210,
    endFrequency: 236,
    duration: 0.045,
    gain: 0.035,
    wave: 'sine',
  },
  endingTrigger: {
    frequency: 110,
    endFrequency: 440,
    duration: 1.4,
    gain: 0.18,
    wave: 'sine',
  },
};

const ZONE_CHORDS: Readonly<Record<MusicZone, readonly number[]>> = {
  south: [146.83, 174.61, 220],
  east: [196, 246.94, 293.66],
  west: [130.81, 164.81, 220],
  north: [98, 123.47, 146.83],
};

const ZONE_FILTERS: Readonly<Record<MusicZone, number>> = {
  south: 720,
  east: 1250,
  west: 540,
  north: 360,
};

const CROSSFADE_SECONDS = 2.2;
const PAD_SECONDS = 4;
const FOOTSTEP_PHASES = [0.16, 0.66] as const;

export type LandingSoundTier = 'soft' | 'hard';

export function getLandingSoundTier(
  verticalSpeed: number,
  hardThreshold = tuning.landingHardSpeedThreshold,
): LandingSoundTier {
  return Math.abs(verticalSpeed) >= hardThreshold ? 'hard' : 'soft';
}

export function getFootstepPhaseCrossings(
  previousPhase: number | undefined,
  currentPhase: number | undefined,
): number {
  if (previousPhase === undefined || currentPhase === undefined) return 0;
  const previous = ((previousPhase % 1) + 1) % 1;
  const current = ((currentPhase % 1) + 1) % 1;
  if (current >= previous) {
    return FOOTSTEP_PHASES.filter(
      (phase) => phase > previous && phase <= current,
    ).length;
  }
  return FOOTSTEP_PHASES.filter((phase) => phase > previous || phase <= current)
    .length;
}

function defaultContextFactory(): AudioContext {
  return new AudioContext();
}

function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0));
}

export function getMusicZone(
  position: Readonly<{ x: number; z: number }>,
): MusicZone {
  if (position.z <= -70) return 'south';
  if (position.x >= 70) return 'east';
  if (position.x <= -70) return 'west';
  if (position.z >= 70) return 'north';
  return 'south';
}

/** Procedural WebAudio only: construction is deliberately context-free. */
export class AudioSystem {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private sfxBus: GainNode | undefined;
  private musicBus: GainNode | undefined;
  private readonly zoneBuses = new Map<MusicZone, GainNode>();
  private readonly activeSources = new Set<AudioScheduledSourceNode>();
  private volume: number;
  private appliedVolume: number;
  private zone: MusicZone = 'south';
  private nextChordTime = 0;
  private chordIndex = 0;
  private ending: 'awaken' | 'rest' | undefined;
  private previousRunPhase: number | undefined;
  private footstepIndex = 0;
  private removeGestureListeners: (() => void) | undefined;

  public constructor(
    volume = 0.8,
    private readonly contextFactory: AudioContextFactory = defaultContextFactory,
  ) {
    this.volume = clampVolume(volume);
    this.appliedVolume = this.volume;
  }

  public bindGestureUnlock(target: Window): () => void {
    if (this.removeGestureListeners) return this.removeGestureListeners;
    const unlock = (): void => this.unlockFromGesture();
    target.addEventListener('pointerdown', unlock, { passive: true });
    target.addEventListener('keydown', unlock);
    this.removeGestureListeners = () => {
      target.removeEventListener('pointerdown', unlock);
      target.removeEventListener('keydown', unlock);
      this.removeGestureListeners = undefined;
    };
    return this.removeGestureListeners;
  }

  /** Call only from a pointer/keyboard event handler to satisfy autoplay rules. */
  public unlockFromGesture(): void {
    if (this.context) return;
    const context = this.contextFactory();
    this.context = context;
    const master = context.createGain();
    const sfxBus = context.createGain();
    const musicBus = context.createGain();
    master.gain.value = this.volume;
    sfxBus.gain.value = 1;
    musicBus.gain.value = 0.38;
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(context.destination);
    this.master = master;
    this.sfxBus = sfxBus;
    this.musicBus = musicBus;
    for (const zone of Object.keys(ZONE_CHORDS) as MusicZone[]) {
      const zoneBus = context.createGain();
      zoneBus.gain.value = zone === this.zone ? 1 : 0;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = ZONE_FILTERS[zone];
      zoneBus.connect(filter);
      filter.connect(musicBus);
      this.zoneBuses.set(zone, zoneBus);
    }
    this.nextChordTime = context.currentTime;
    this.appliedVolume = this.volume;
    this.removeGestureListeners?.();
    if (context.state === 'suspended') void context.resume();
  }

  public setVolume(volume: number): void {
    this.volume = clampVolume(volume);
    this.appliedVolume = this.volume;
    if (!this.context || !this.master) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setValueAtTime(this.volume, this.context.currentTime);
    if (this.volume === 0) {
      for (const source of this.activeSources) source.stop();
      this.activeSources.clear();
    } else {
      this.nextChordTime = this.context.currentTime;
    }
  }

  public play(event: AudioEvent, options: AudioEventOptions = {}): void {
    if (!this.context || !this.sfxBus || this.volume === 0) return;
    if (event === 'abilityUnlock' || event === 'shrineFanfare') {
      this.playArpeggio(
        event === 'shrineFanfare' ? [0, 4, 7, 11, 12] : [0, 4, 7, 12],
        TONES[event],
      );
      return;
    }
    if (event === 'uiConfirm' || event === 'uiBack') {
      this.playArpeggio(event === 'uiConfirm' ? [0, 5] : [0, -5], TONES[event]);
      return;
    }
    const tone = TONES[event];
    const streakSemitones =
      event === 'shardPickup'
        ? Math.min(7, Math.max(0, (options.streak ?? 1) - 1))
        : 0;
    const endingScale =
      event === 'endingTrigger' && options.ending === 'rest' ? 0.72 : 1;
    this.scheduleTone(
      {
        ...tone,
        frequency: tone.frequency * 2 ** (streakSemitones / 12) * endingScale,
        endFrequency:
          tone.endFrequency * 2 ** (streakSemitones / 12) * endingScale,
      },
      this.context.currentTime,
      this.sfxBus,
    );
  }

  public playLanding(verticalSpeed: number): void {
    if (!this.context || !this.sfxBus || this.volume === 0) return;
    const tier = getLandingSoundTier(verticalSpeed);
    this.scheduleTone(
      tier === 'hard'
        ? {
            frequency: 88,
            endFrequency: 42,
            duration: 0.19,
            gain: 0.13,
            wave: 'sawtooth',
          }
        : {
            frequency: 116,
            endFrequency: 72,
            duration: 0.11,
            gain: 0.075,
            wave: 'triangle',
          },
      this.context.currentTime,
      this.sfxBus,
    );
  }

  public updateFootsteps(
    runPhase: number | undefined,
    horizontalSpeed: number,
    grounded: boolean,
  ): void {
    const activePhase =
      grounded && horizontalSpeed > 0.05 ? runPhase : undefined;
    const crossings = getFootstepPhaseCrossings(
      this.previousRunPhase,
      activePhase,
    );
    this.previousRunPhase = activePhase;
    if (!this.context || !this.sfxBus || this.volume === 0) return;
    for (let index = 0; index < crossings; index += 1) {
      const alternate = this.footstepIndex % 2;
      const speedVolume = Math.min(1, horizontalSpeed / tuning.runSpeed);
      this.scheduleTone(
        {
          frequency: alternate === 0 ? 104 : 127,
          endFrequency: alternate === 0 ? 58 : 69,
          duration: 0.075,
          gain: tuning.footstepBaseVolume * speedVolume,
          wave: alternate === 0 ? 'triangle' : 'square',
        },
        this.context.currentTime,
        this.sfxBus,
      );
      this.footstepIndex += 1;
    }
  }

  public update(
    _deltaSeconds: number,
    position: Readonly<{ x: number; z: number }>,
  ): void {
    const nextZone = getMusicZone(position);
    if (nextZone !== this.zone && !this.ending) this.crossfadeTo(nextZone);
    if (!this.context || this.volume === 0 || this.ending === 'rest') return;
    while (this.nextChordTime < this.context.currentTime + 0.5) {
      this.schedulePadChord(this.nextChordTime);
      this.nextChordTime += PAD_SECONDS;
      this.chordIndex += 1;
    }
  }

  public triggerEnding(choice: 'awaken' | 'rest'): void {
    this.ending = choice;
    this.play('endingTrigger', { ending: choice });
    if (!this.context || !this.musicBus || this.volume === 0) return;
    const now = this.context.currentTime;
    if (choice === 'awaken') {
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
      this.musicBus.gain.linearRampToValueAtTime(0.52, now + 2.4);
      this.playArpeggio([0, 4, 7, 11, 12], {
        ...TONES.abilityUnlock,
        frequency: 293.66,
        endFrequency: 1174.66,
        gain: 0.11,
      });
    } else {
      for (const bus of this.zoneBuses.values()) {
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(0, now + 3.5);
      }
      this.scheduleTone(
        {
          frequency: 146.83,
          endFrequency: 146.83,
          duration: 6,
          gain: 0.09,
          wave: 'sine',
        },
        now + 1.2,
        this.musicBus,
      );
    }
  }

  public playEndingWave(
    choice: 'awaken' | 'rest',
    waveIndex: number,
  ): void {
    if (!this.context || !this.sfxBus || this.volume === 0) return;
    const index = Math.max(0, Math.floor(waveIndex));
    const semitones = choice === 'awaken' ? index * 4 : -index * 3;
    const frequency = 196 * 2 ** (semitones / 12);
    this.scheduleTone(
      {
        frequency,
        endFrequency: frequency * (choice === 'awaken' ? 1.5 : 0.72),
        duration: 0.7,
        gain: 0.055 + index * 0.018,
        wave: choice === 'awaken' ? 'triangle' : 'sine',
      },
      this.context.currentTime,
      this.sfxBus,
    );
  }

  public getState(): AudioState {
    return {
      initialized: this.context !== undefined,
      volume: this.volume,
      respectsVolume: this.appliedVolume === this.volume,
      zone: this.zone,
    };
  }

  public dispose(): void {
    this.removeGestureListeners?.();
    for (const source of this.activeSources) source.stop();
    this.activeSources.clear();
    if (this.context) void this.context.close();
    this.context = undefined;
  }

  private crossfadeTo(zone: MusicZone): void {
    this.zone = zone;
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const [id, bus] of this.zoneBuses) {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(
        id === zone ? 1 : 0,
        now + CROSSFADE_SECONDS,
      );
    }
  }

  private schedulePadChord(startTime: number): void {
    if (!this.context || this.volume === 0) return;
    for (const [zone, frequencies] of Object.entries(ZONE_CHORDS) as Array<
      [MusicZone, readonly number[]]
    >) {
      const output = this.zoneBuses.get(zone);
      if (!output) continue;
      const inversion = this.chordIndex % 2 === 0 ? 1 : 2 ** (2 / 12);
      for (const frequency of frequencies) {
        this.scheduleTone(
          {
            frequency: frequency * inversion,
            endFrequency: frequency * inversion * 1.002,
            duration: PAD_SECONDS + 0.8,
            gain: 0.018,
            wave: zone === 'west' ? 'sine' : 'triangle',
          },
          startTime,
          output,
        );
      }
    }
  }

  private playArpeggio(intervals: readonly number[], base: Tone): void {
    if (!this.context || !this.sfxBus || this.volume === 0) return;
    intervals.forEach((semitones, index) => {
      const frequency = base.frequency * 2 ** (semitones / 12);
      this.scheduleTone(
        {
          ...base,
          frequency,
          endFrequency: frequency * 1.02,
          duration: Math.min(0.45, base.duration),
          gain: base.gain * 0.72,
        },
        this.context!.currentTime + index * 0.105,
        this.sfxBus!,
      );
    });
  }

  private scheduleTone(tone: Tone, startTime: number, output: AudioNode): void {
    if (!this.context || this.volume === 0) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = tone.wave;
    oscillator.frequency.setValueAtTime(tone.frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, tone.endFrequency),
      startTime + tone.duration,
    );
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(
      tone.gain,
      startTime + Math.min(0.08, tone.duration * 0.25),
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + tone.duration,
    );
    oscillator.connect(envelope);
    envelope.connect(output);
    this.activeSources.add(oscillator);
    oscillator.addEventListener(
      'ended',
      () => this.activeSources.delete(oscillator),
      {
        once: true,
      },
    );
    oscillator.start(startTime);
    oscillator.stop(startTime + tone.duration + 0.02);
  }
}

export const AUDIO_EVENT_HANDLERS: Readonly<
  Record<AudioEvent, (audio: AudioSystem, options?: AudioEventOptions) => void>
> = Object.fromEntries(
  AUDIO_EVENTS.map((event) => [
    event,
    (audio: AudioSystem, options?: AudioEventOptions) =>
      audio.play(event, options),
  ]),
) as Record<
  AudioEvent,
  (audio: AudioSystem, options?: AudioEventOptions) => void
>;
