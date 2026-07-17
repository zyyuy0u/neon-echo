import { describe, expect, it } from 'vitest';

import { EndingState } from '../src/systems/ending/EndingState';

const allAbilities = new Set(['dash', 'doubleJump', 'glide'] as const);

describe('ending state', () => {
  it('keeps the core locked at 29 shards or with any missing ability', () => {
    expect(new EndingState(29, allAbilities).canInteract()).toBe(false);
    expect(
      new EndingState(
        30,
        new Set(['dash', 'doubleJump'] as const),
      ).canInteract(),
    ).toBe(false);
  });

  it('opens the core when all requirements are met', () => {
    const ending = new EndingState(30, allAbilities);
    expect(ending.canInteract()).toBe(true);
    expect(ending.interact()).toBe(true);
    expect(ending.getPhase()).toBe('choosing');
  });

  it.each(['awaken', 'rest'] as const)(
    'resolves the %s branch and excludes the other ending',
    (choice) => {
      const ending = new EndingState(30, allAbilities);
      ending.interact();
      expect(ending.choose(choice)).toBe(true);
      expect(ending.getChoice()).toBe(choice);
      expect(ending.choose(choice === 'awaken' ? 'rest' : 'awaken')).toBe(
        false,
      );
    },
  );
});
