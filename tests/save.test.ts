import { describe, expect, it } from 'vitest';

import {
  advancePlaytime,
  clearSaveData,
  createDefaultSaveData,
  hasSaveData,
  loadSaveData,
  SAVE_STORAGE_KEY,
  SAVE_VERSION,
  saveData,
} from '../src/systems/save/SaveSystem';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('save system', () => {
  it('round-trips the complete schema with a version field', () => {
    const storage = new MemoryStorage();
    const data = createDefaultSaveData();
    data.abilities = ['dash'];
    data.collectedShardIds = ['shard-plaza-01'];
    data.readSteleIds = ['stele-plaza-01'];
    data.discoveredZoneIds = ['skylift', 'spire'];
    data.playerPosition = { x: 12, y: 4, z: -8 };
    data.settings.language = 'en';
    data.settings.autoCameraBehind = false;
    data.tutorialFlags.jumpGap = true;
    data.ending.choice = 'awaken';
    data.playtimeSeconds = advancePlaytime(data.playtimeSeconds, 123.5);
    data.dayPhase = 0.375;

    saveData(data, storage);

    expect(loadSaveData(storage)).toEqual(data);
    expect(loadSaveData(storage).version).toBe(SAVE_VERSION);
    expect(loadSaveData(storage).playtimeSeconds).toBe(123.5);
    expect(loadSaveData(storage).dayPhase).toBe(0.375);
    expect(loadSaveData(storage).settings.autoCameraBehind).toBe(false);
    expect(loadSaveData(storage).tutorialFlags.jumpGap).toBe(true);
    expect(loadSaveData(storage).discoveredZoneIds).toEqual([
      'skylift',
      'spire',
    ]);
  });

  it('migrates v1 settings with auto camera enabled and fresh tutorials', () => {
    const storage = new MemoryStorage();
    const legacy = createDefaultSaveData() as unknown as Record<
      string,
      unknown
    >;
    legacy.version = 1;
    delete legacy.tutorialFlags;
    const legacySettings = legacy.settings as Record<string, unknown>;
    delete legacySettings.autoCameraBehind;
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

    const migrated = loadSaveData(storage);
    expect(migrated.settings.autoCameraBehind).toBe(true);
    expect(migrated.tutorialFlags).toEqual({
      jumpGap: false,
      dashMove: false,
      firstStele: false,
    });
  });

  it('migrates v2 saves with an empty discovery journal', () => {
    const storage = new MemoryStorage();
    const legacy = createDefaultSaveData() as unknown as Record<
      string,
      unknown
    >;
    legacy.version = 2;
    delete legacy.discoveredZoneIds;
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

    expect(loadSaveData(storage).discoveredZoneIds).toEqual([]);
  });

  it('migrates v3 saves with the sunset phase as their baseline', () => {
    const storage = new MemoryStorage();
    const legacy = createDefaultSaveData() as unknown as Record<
      string,
      unknown
    >;
    legacy.version = 3;
    delete legacy.dayPhase;
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

    expect(loadSaveData(storage).dayPhase).toBe(0);
  });

  it('migrates a v4 single volume into independent music and sfx tracks', () => {
    const storage = new MemoryStorage();
    const legacy = createDefaultSaveData() as unknown as Record<
      string,
      unknown
    >;
    legacy.version = 4;
    const legacySettings = legacy.settings as Record<string, unknown>;
    legacySettings.volume = 0.35;
    delete legacySettings.musicVolume;
    delete legacySettings.sfxVolume;
    delete legacySettings.resolutionScale;
    delete legacySettings.bloomEnabled;
    delete legacySettings.bloomIntensity;
    delete legacySettings.fieldOfView;
    delete legacySettings.showFps;
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));

    const migrated = loadSaveData(storage);
    expect(migrated.settings.musicVolume).toBe(0.35);
    expect(migrated.settings.sfxVolume).toBe(0.35);
    expect(migrated.settings.resolutionScale).toBe(1);
    expect(migrated.settings).not.toHaveProperty('volume');
  });

  it('only advances playtime for positive elapsed time', () => {
    const elapsed = advancePlaytime(42, 3.5);

    expect(elapsed).toBe(45.5);
    expect(advancePlaytime(elapsed, -100)).toBe(elapsed);
    expect(advancePlaytime(elapsed, Number.NaN)).toBe(elapsed);
  });

  it.each([
    ['damaged JSON', '{broken'],
    ['unknown schema version', JSON.stringify({ version: 999 })],
  ])('safely falls back for %s', (_label, serialized) => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_STORAGE_KEY, serialized);

    expect(() => loadSaveData(storage)).not.toThrow();
    expect(loadSaveData(storage)).toEqual(createDefaultSaveData());
  });

  it('clears the save for a new game', () => {
    const storage = new MemoryStorage();
    saveData(createDefaultSaveData(), storage);
    expect(hasSaveData(storage)).toBe(true);

    clearSaveData(storage);

    expect(hasSaveData(storage)).toBe(false);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
  });
});
