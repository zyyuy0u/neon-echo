import { describe, expect, it } from 'vitest';

import {
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
    data.playerPosition = { x: 12, y: 4, z: -8 };
    data.settings.language = 'en';
    data.ending.choice = 'awaken';

    saveData(data, storage);

    expect(loadSaveData(storage)).toEqual(data);
    expect(loadSaveData(storage).version).toBe(SAVE_VERSION);
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
