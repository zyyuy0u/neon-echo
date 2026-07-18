import { describe, expect, it } from 'vitest';

import {
  getCharacterPose,
  type CharacterAnimationState,
} from '../src/systems/character/CharacterAvatar';

describe('character avatar state mapping', () => {
  it.each<[CharacterAnimationState, string, number, boolean, boolean]>([
    ['idle', 'CharacterArmature|Idle_Neutral', 0, false, false],
    ['run', 'CharacterArmature|Run', 0, false, false],
    ['dash', 'CharacterArmature|Roll', 0, false, false],
    ['interact', 'CharacterArmature|Interact', 0, false, true],
    ['jumpRise', 'CharacterArmature|Idle_Neutral', -8, true, false],
    ['fall', 'CharacterArmature|Idle_Neutral', 12, true, false],
    ['glide', 'CharacterArmature|Idle_Neutral', 25, true, false],
  ])(
    'maps %s to its clip and procedural pose',
    (state, clip, tiltDegrees, frozen, playOnce) => {
      expect(getCharacterPose(state)).toEqual({
        clip,
        tiltDegrees,
        frozen,
        playOnce,
      });
    },
  );
});
