import { describe, expect, it } from 'vitest';

import {
  createDefaultTutorialFlags,
  TutorialSystem,
} from '../src/systems/tutorial/TutorialSystem';
import {
  createDefaultSaveData,
  loadSaveData,
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

describe('one-shot tutorials', () => {
  it('triggers, marks, persists, restores, and does not trigger again', () => {
    const tutorials = new TutorialSystem();
    tutorials.restore(createDefaultTutorialFlags());
    const context = {
      position: { x: 0, y: 1.2, z: -66 },
      moving: false,
      abilities: new Set<'dash' | 'doubleJump' | 'glide'>(),
    };

    expect(tutorials.trigger(context)?.id).toBe('jumpGap');
    expect(tutorials.getFlags().jumpGap).toBe(true);
    expect(tutorials.trigger(context)).toBeUndefined();

    const storage = new MemoryStorage();
    const save = createDefaultSaveData();
    save.tutorialFlags = tutorials.getFlags();
    saveData(save, storage);

    const restored = new TutorialSystem();
    restored.restore(loadSaveData(storage).tutorialFlags);
    expect(restored.trigger(context)).toBeUndefined();
    expect(restored.getFlags().jumpGap).toBe(true);
  });

  it('shows the dash hint only after unlock and movement', () => {
    const tutorials = new TutorialSystem();
    const position = { x: 40, y: 1.2, z: 40 };
    expect(
      tutorials.trigger({ position, moving: true, abilities: new Set() }),
    ).toBeUndefined();
    expect(
      tutorials.trigger({
        position,
        moving: false,
        abilities: new Set(['dash'] as const),
      }),
    ).toBeUndefined();
    expect(
      tutorials.trigger({
        position,
        moving: true,
        abilities: new Set(['dash'] as const),
      })?.id,
    ).toBe('dashMove');
  });
});
