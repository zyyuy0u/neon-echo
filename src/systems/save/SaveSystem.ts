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
import {
  createDefaultObjectiveTracking,
  type ObjectiveTrackingSnapshot,
} from '../objectives/ObjectiveTracker';
import {
  createDefaultStatistics,
  type StatisticsSnapshot,
} from '../statistics/Statistics';

export const SAVE_VERSION = 7;
export const SAVE_STORAGE_KEY = 'neon-echo-save';

export type SubtitleSize = 'small' | 'medium' | 'large';
export type ResolutionScale = 0.5 | 0.75 | 1;

export interface GameSettings {
  language: Language;
  mouseSensitivity: number;
  reducedMotion: boolean;
  autoCameraBehind: boolean;
  bindings: KeyBindings;
  musicVolume: number;
  sfxVolume: number;
  subtitleSize: SubtitleSize;
  resolutionScale: ResolutionScale;
  bloomEnabled: boolean;
  bloomIntensity: number;
  fieldOfView: number;
  showFps: boolean;
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
  objectiveTracking: ObjectiveTrackingSnapshot;
  ending: { choice: EndingChoice | null };
  unlockedAchievementIds: string[];
  statistics: StatisticsSnapshot;
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
    musicVolume: 0.8,
    sfxVolume: 0.8,
    subtitleSize: 'medium',
    resolutionScale: 1,
    bloomEnabled: true,
    bloomIntensity: 1,
    fieldOfView: 75,
    showFps: false,
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
    objectiveTracking: createDefaultObjectiveTracking(),
    ending: { choice: null },
    unlockedAchievementIds: [],
    statistics: createDefaultStatistics(),
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
    !isFiniteNumber(settings.musicVolume) ||
    settings.musicVolume < 0 ||
    settings.musicVolume > 1 ||
    !isFiniteNumber(settings.sfxVolume) ||
    settings.sfxVolume < 0 ||
    settings.sfxVolume > 1 ||
    !['small', 'medium', 'large'].includes(settings.subtitleSize as string) ||
    ![0.5, 0.75, 1].includes(settings.resolutionScale as number) ||
    typeof settings.bloomEnabled !== 'boolean' ||
    !isFiniteNumber(settings.bloomIntensity) ||
    settings.bloomIntensity < 0.5 ||
    settings.bloomIntensity > 1.5 ||
    !isFiniteNumber(settings.fieldOfView) ||
    settings.fieldOfView < 60 ||
    settings.fieldOfView > 100 ||
    typeof settings.showFps !== 'boolean' ||
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
  if (
    !isObject(value.objectiveTracking) ||
    (value.objectiveTracking.customTargetId !== null &&
      typeof value.objectiveTracking.customTargetId !== 'string')
  ) {
    return false;
  }
  if (
    !Array.isArray(value.unlockedAchievementIds) ||
    !value.unlockedAchievementIds.every((id) => typeof id === 'string') ||
    !isObject(value.statistics) ||
    !Number.isInteger(value.statistics.warpCount) ||
    (value.statistics.warpCount as number) < 0 ||
    !Number.isInteger(value.statistics.photoCount) ||
    (value.statistics.photoCount as number) < 0 ||
    !Array.isArray(value.statistics.endings) ||
    !value.statistics.endings.every(
      (choice) => choice === 'awaken' || choice === 'rest',
    )
  ) {
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
      value.version !== 4 &&
      value.version !== 5 &&
      value.version !== 6 &&
      value.version !== SAVE_VERSION)
  ) {
    return undefined;
  }
  const defaults = createDefaultSettings();
  const settings = isObject(value.settings)
    ? (() => {
        const legacyVolume = isFiniteNumber(value.settings.volume)
          ? value.settings.volume
          : undefined;
        const migratedSettings = {
          ...defaults,
          ...value.settings,
          autoCameraBehind: value.settings.autoCameraBehind ?? true,
          musicVolume:
            value.settings.musicVolume ?? legacyVolume ?? defaults.musicVolume,
          sfxVolume:
            value.settings.sfxVolume ?? legacyVolume ?? defaults.sfxVolume,
          resolutionScale:
            value.settings.resolutionScale ?? defaults.resolutionScale,
          bloomEnabled: value.settings.bloomEnabled ?? defaults.bloomEnabled,
          bloomIntensity:
            value.settings.bloomIntensity ?? defaults.bloomIntensity,
          fieldOfView: value.settings.fieldOfView ?? defaults.fieldOfView,
          showFps: value.settings.showFps ?? defaults.showFps,
        };
        Reflect.deleteProperty(migratedSettings, 'volume');
        return migratedSettings;
      })()
    : value.settings;
  const candidate = {
    ...value,
    version: SAVE_VERSION,
    settings,
    discoveredZoneIds: value.discoveredZoneIds ?? [],
    tutorialFlags: value.tutorialFlags ?? createDefaultTutorialFlags(),
    objectiveTracking:
      value.objectiveTracking ?? createDefaultObjectiveTracking(),
    unlockedAchievementIds: value.unlockedAchievementIds ?? [],
    statistics: value.statistics ?? createDefaultStatistics(),
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
