import { describe, expect, it } from 'vitest';

import {
  getVisibleCharacterCount,
  STELE_CHARACTER_INTERVAL_MS,
} from '../src/systems/narrative/typewriter';

describe('stele typewriter schedule', () => {
  const text = '回聲行者，醒來。';

  it('reveals one character per 18ms and clamps to the text length', () => {
    expect(getVisibleCharacterCount(text, 0)).toBe(0);
    expect(getVisibleCharacterCount(text, STELE_CHARACTER_INTERVAL_MS - 1)).toBe(
      0,
    );
    expect(getVisibleCharacterCount(text, STELE_CHARACTER_INTERVAL_MS)).toBe(1);
    expect(getVisibleCharacterCount(text, 54)).toBe(3);
    expect(getVisibleCharacterCount(text, 10_000)).toBe(text.length);
  });

  it('reveals the complete text immediately after skip', () => {
    expect(getVisibleCharacterCount(text, 0, true)).toBe(text.length);
  });
});

