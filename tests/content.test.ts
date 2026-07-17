import { describe, expect, it } from 'vitest';

import { STELES } from '../src/content/steles';

describe('stele narrative content', () => {
  it('contains 12 unique bilingual entries with substantive Chinese text', () => {
    expect(STELES).toHaveLength(12);
    expect(new Set(STELES.map((stele) => stele.id)).size).toBe(12);
    for (const stele of STELES) {
      expect(stele.zh.trim()).not.toBe('');
      expect(stele.en.trim()).not.toBe('');
      expect(stele.zh.length).toBeGreaterThanOrEqual(40);
      expect(stele.zh.length).toBeLessThanOrEqual(90);
    }
  });
});
