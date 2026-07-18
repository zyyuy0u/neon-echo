import type { Ability } from '../../world/map/types';
import type { AbilityState } from '../abilities/AbilityState';

export type PuzzleId = 'pulseTrack' | 'lightBridge' | 'windWell';

export interface PuzzleSnapshot {
  id: PuzzleId;
  completed: boolean;
  altarActivated: boolean;
}

export class PulseTrackPuzzle {
  public static readonly segmentCount = 4;
  public static readonly cycleSeconds = 4;
  private readonly visited = new Set<number>();
  public completed = false;

  public getActiveSegments(elapsedSeconds: number): readonly number[] {
    const phase =
      ((elapsedSeconds % PulseTrackPuzzle.cycleSeconds) +
        PulseTrackPuzzle.cycleSeconds) %
      PulseTrackPuzzle.cycleSeconds;
    const first = Math.floor(phase) % PulseTrackPuzzle.segmentCount;
    return [first, (first + 1) % PulseTrackPuzzle.segmentCount];
  }

  public visit(segment: number, elapsedSeconds: number): boolean {
    if (
      segment < 0 ||
      segment >= PulseTrackPuzzle.segmentCount ||
      !this.getActiveSegments(elapsedSeconds).includes(segment)
    ) {
      return false;
    }
    const expected = this.visited.size;
    if (segment !== expected) {
      this.visited.clear();
      if (segment !== 0) return false;
    }
    this.visited.add(segment);
    this.completed = this.visited.size === PulseTrackPuzzle.segmentCount;
    return true;
  }
}

export class LightBridgePuzzle {
  private readonly sequence = [0, 1, 2] as const;
  private progress = 0;
  public completed = false;

  public get activatedSwitches(): number {
    return this.progress;
  }

  public stepOn(switchIndex: number): boolean {
    if (this.completed) return true;
    if (switchIndex !== this.sequence[this.progress]) {
      this.progress = switchIndex === this.sequence[0] ? 1 : 0;
      return false;
    }
    this.progress += 1;
    this.completed = this.progress === this.sequence.length;
    return true;
  }
}

export class WindWellPuzzle {
  public completed = false;

  public reachHeight(height: number, targetHeight: number): boolean {
    if (height >= targetHeight) this.completed = true;
    return this.completed;
  }
}

const PUZZLE_ABILITY: Readonly<Record<PuzzleId, Ability>> = {
  pulseTrack: 'dash',
  lightBridge: 'doubleJump',
  windWell: 'glide',
};

export class PuzzleState {
  public readonly pulseTrack = new PulseTrackPuzzle();
  public readonly lightBridge = new LightBridgePuzzle();
  public readonly windWell = new WindWellPuzzle();
  private readonly activatedAltars = new Set<PuzzleId>();

  public constructor(private readonly abilities: AbilityState) {}

  public get(id: PuzzleId): PuzzleSnapshot {
    return {
      id,
      completed: this.getMachine(id).completed,
      altarActivated: this.activatedAltars.has(id),
    };
  }

  public activateAltar(id: PuzzleId): boolean {
    if (!this.getMachine(id).completed || this.activatedAltars.has(id)) {
      return false;
    }
    this.activatedAltars.add(id);
    return this.abilities.unlock(PUZZLE_ABILITY[id]);
  }

  public complete(id: PuzzleId): boolean {
    const machine = this.getMachine(id);
    if (machine.completed) return false;
    machine.completed = true;
    return true;
  }

  public getAll(): Record<PuzzleId, PuzzleSnapshot> {
    return {
      pulseTrack: this.get('pulseTrack'),
      lightBridge: this.get('lightBridge'),
      windWell: this.get('windWell'),
    };
  }

  public restore(snapshots: Readonly<Record<PuzzleId, PuzzleSnapshot>>): void {
    this.pulseTrack.completed = snapshots.pulseTrack.completed;
    this.lightBridge.completed = snapshots.lightBridge.completed;
    this.windWell.completed = snapshots.windWell.completed;
    this.activatedAltars.clear();
    for (const id of Object.keys(snapshots) as PuzzleId[]) {
      if (snapshots[id].altarActivated) this.activatedAltars.add(id);
    }
  }

  private getMachine(
    id: PuzzleId,
  ): PulseTrackPuzzle | LightBridgePuzzle | WindWellPuzzle {
    if (id === 'pulseTrack') return this.pulseTrack;
    if (id === 'lightBridge') return this.lightBridge;
    return this.windWell;
  }
}
