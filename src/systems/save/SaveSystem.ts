import type { Ability, ZoneId } from '../../world/map/types';
import {
  DEFAULT_BINDINGS,
  INPUT_ACTIONS,
  type KeyBindings,
} from '../input/bindings';
import type { EndingChoice } from '../ending/EndingState';
import type { PuzzleId, PuzzleSnapshot } from '../puzzles/PuzzleState';
import type { Language } from '../../ui/i18n';
import {
  createDefaultTutorialFlags,
  TUTORIAL_IDS,
  type TutorialFlags,
} from '../tutorial/TutorialSystem';

export const SAVE_VERSION = 4;
export const SAVE_STORAGE_KEY = 'neon-echo-save';

export type SubtitleSize = 'small' | 'medium' | 'large';

export interface GameSettings {
  language: Language;
  mouseSensitivity: number;
  reducedMotion: boolean;
  autoCameraBehind: boolean;
  bindings: KeyBindings;
  volume: number;
  subtitleSize: SubtitleSize;
}

export interface SavedPosition {
  x: number;
  y: number;
  z: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  abilities: Ability[];
  collectedShardIds: string[];
  readSteleIds: string[];
  discoveredZoneIds: ZoneId[];
  puzzles: Record<PuzzleId, PuzzleSnapshot>;
  playerPosition: SavedPosition;
  settings: GameSettings;
  tutorialFlags: TutorialFlags;
  ending: { choice: EndingChoice | null };
  playtimeSeconds: number;
  dayPhase: number;
}

const PUZZLE_IDS: readonly PuzzleId[] = [
  'pulseTrack',
  'lightBridge',
  'windWell',
];
const ABILITIES: readonly Ability[] = ['dash', 'doubleJump', 'glide'];
const ZONE_IDS: readonly ZoneId[] = [
  'plaza',
  'skylift',
  'spire',
  'ring',
  'chasm',
];

export function createDefaultSettings(): GameSettings {
  return {
    language: 'zh-TW',
    mouseSensitivity: 1,
    reducedMotion: false,
    autoCameraBehind: true,
    bindings: { ...DEFAULT_BINDINGS },
    volume: 0.8,
    subtitleSize: 'medium',
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    abilities: [],
    collectedShardIds: [],
    readSteleIds: [],
    discoveredZoneIds: [],
    puzzles: {
      pulseTrack: {
        id: 'pulseTrack',
        completed: false,
        altarActivated: false,
      },
      lightBridge: {
        id: 'lightBridge',
        completed: false,
        altarActivated: false,
      },
      windWell: {
        id: 'windWell',
        completed: false,
        altarActivated: false,
      },
    },
    playerPosition: { x: 0, y: 1.2, z: 0 },
    settings: createDefaultSettings(),
    tutorialFlags: createDefaultTutorialFlags(),
    ending: { choice: null },
    playtimeSeconds: 0,
    dayPhase: 0,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSaveData(value: unknown): value is SaveData {
  if (!isObject(value) || value.version !== SAVE_VERSION) return false;
  if (
    !Array.isArray(value.abilities) ||
    !value.abilities.every((ability) =>
      ABILITIES.includes(ability as Ability),
    ) ||
    !Array.isArray(value.collectedShardIds) ||
    !value.collectedShardIds.every((id) => typeof id === 'string') ||
    !Array.isArray(value.readSteleIds) ||
    !value.readSteleIds.every((id) => typeof id === 'string') ||
    !Array.isArray(value.discoveredZoneIds) ||
    !value.discoveredZoneIds.every((id) => ZONE_IDS.includes(id as ZoneId))
  ) {
    return false;
  }
  if (!isObject(value.playerPosition)) return false;
  if (
    !isFiniteNumber(value.playerPosition.x) ||
    !isFiniteNumber(value.playerPosition.y) ||
    !isFiniteNumber(value.playerPosition.z)
  ) {
    return false;
  }
  if (!isObject(value.settings)) return false;
  const settings = value.settings;
  if (!isObject(settings.bindings)) return false;
  const bindings = settings.bindings;
  if (
    (settings.language !== 'zh-TW' && settings.language !== 'en') ||
    !isFiniteNumber(settings.mouseSensitivity) ||
    typeof settings.reducedMotion !== 'boolean' ||
    typeof settings.autoCameraBehind !== 'boolean' ||
    !isFiniteNumber(settings.volume) ||
    !['small', 'medium', 'large'].includes(settings.subtitleSize as string) ||
    !INPUT_ACTIONS.every((action) => typeof bindings[action] === 'string')
  ) {
    return false;
  }
  if (!isObject(value.puzzles)) return false;
  const puzzles = value.puzzles;
  if (
    !PUZZLE_IDS.every((id) => {
      const puzzle = puzzles[id];
      return (
        isObject(puzzle) &&
        puzzle.id === id &&
        typeof puzzle.completed === 'boolean' &&
        typeof puzzle.altarActivated === 'boolean'
      );
    })
  ) {
    return false;
  }
  if (!isObject(value.tutorialFlags)) {
    return false;
  }
  const tutorialFlags = value.tutorialFlags;
  if (!TUTORIAL_IDS.every((id) => typeof tutorialFlags[id] === 'boolean')) {
    return false;
  }
  return (
    isFiniteNumber(value.playtimeSeconds) &&
    value.playtimeSeconds >= 0 &&
    isFiniteNumber(value.dayPhase) &&
    value.dayPhase >= 0 &&
    value.dayPhase < 1 &&
    isObject(value.ending) &&
    (value.ending.choice === null ||
      value.ending.choice === 'awaken' ||
      value.ending.choice === 'rest')
  );
}

/** Migration entry point. Add prior-version migrations here as schemas evolve. */
export function migrateSaveData(value: unknown): SaveData | undefined {
  if (
    !isObject(value) ||
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== SAVE_VERSION)
  ) {
    return undefined;
  }
  const settings = isObject(value.settings)
    ? {
        ...value.settings,
        autoCameraBehind: value.settings.autoCameraBehind ?? true,
      }
    : value.settings;
  const candidate = {
    ...value,
    version: SAVE_VERSION,
    settings,
    discoveredZoneIds: value.discoveredZoneIds ?? [],
    tutorialFlags: value.tutorialFlags ?? createDefaultTutorialFlags(),
    playtimeSeconds: value.playtimeSeconds ?? 0,
    dayPhase: value.dayPhase ?? 0,
  };
  return isSaveData(candidate) ? structuredClone(candidate) : undefined;
}

export function advancePlaytime(
  currentSeconds: number,
  elapsedSeconds: number,
): number {
  const current = Math.max(
    0,
    Number.isFinite(currentSeconds) ? currentSeconds : 0,
  );
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return current;
  return current + elapsedSeconds;
}

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

export function saveData(data: SaveData, storage?: Storage): void {
  resolveStorage(storage)?.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
}

export function loadSaveData(storage?: Storage): SaveData {
  const target = resolveStorage(storage);
  if (!target) return createDefaultSaveData();
  const serialized = target.getItem(SAVE_STORAGE_KEY);
  if (serialized === null) return createDefaultSaveData();
  try {
    return migrateSaveData(JSON.parse(serialized)) ?? createDefaultSaveData();
  } catch {
    return createDefaultSaveData();
  }
}

export function hasSaveData(storage?: Storage): boolean {
  return resolveStorage(storage)?.getItem(SAVE_STORAGE_KEY) !== null;
}

export function clearSaveData(storage?: Storage): void {
  resolveStorage(storage)?.removeItem(SAVE_STORAGE_KEY);
}
