import { describe, expect, it } from 'vitest';

import { quantityTextCrop } from './visible-quantity';
describe('quantity crop alignment', () => {
  it('includes labels that overhang the icon frame to the left, without entering the next cell', () => {
    const crop = quantityTextCrop({ left: 8, top: 0, width: 500 / 9, height: 56 }, 'storage');
    expect(crop.left).toBeLessThanOrEqual(3);
    expect(crop.left + crop.width).toBeLessThan(58);
    expect(crop.top).toBeLessThan(34);
    expect(crop.top + crop.height).toBeGreaterThan(46);
  });
});
