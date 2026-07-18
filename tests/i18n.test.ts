import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../src/ui/i18n/en';
import {
  dictionaries,
  resetI18nWarningsForTests,
  setLanguage,
  t,
} from '../src/ui/i18n';
import { zh } from '../src/ui/i18n/zh';

describe('i18n dictionaries', () => {
  afterEach(() => {
    setLanguage('zh-TW');
    resetI18nWarningsForTests();
    vi.restoreAllMocks();
  });

  it('has exactly the same non-empty keys in Chinese and English', () => {
    expect(new Set(Object.keys(zh))).toEqual(new Set(Object.keys(en)));
    for (const dictionary of Object.values(dictionaries)) {
      expect(Object.values(dictionary).every((value) => value.length > 0)).toBe(
        true,
      );
    }
  });

  it('returns a missing key and warns only once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(t('missing.example')).toBe('missing.example');
    expect(t('missing.example')).toBe('missing.example');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Missing translation: missing.example');
  });

  it('switches languages and interpolates values', () => {
    setLanguage('en');
    expect(t('menu.settings')).toBe('Settings');
    expect(
      t('ending.stats', { shards: 7, steles: 3, playtime: '00:02:10' }),
    ).toContain('7 / 40');
  });
});
