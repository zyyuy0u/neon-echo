import { describe, expect, it } from 'vitest';

import { getRenderPixelRatio } from '../src/render/resolution';

describe('resolution scaling', () => {
  it('multiplies the capped device ratio by the selected scale', () => {
    expect(getRenderPixelRatio(1, 0.75)).toBe(0.75);
    expect(getRenderPixelRatio(2, 0.5)).toBe(1);
    expect(getRenderPixelRatio(3, 1)).toBe(2);
  });
});
