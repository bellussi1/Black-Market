import { describe, expect, it } from 'vitest';

import { findEquipmentFrames } from './equipment-slots';
import { isDefinitelyEmptySlot } from './slot-visibility';
const pixels = (width: number, height: number, rgb: number[]) =>
  Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) =>
    i % 4 === 3 ? 255 : rgb[i % 4],
  );
describe('Slot visibility and equipment frames', () => {
  it('ignores a uniformly dark empty slot without interpreting no count as one', () => {
    expect(isDefinitelyEmptySlot(pixels(32, 32, [40, 41, 40]), 32, 32)).toBe(true);
  });
  it('retains bright, colorful, textured and malformed unknown slots', () => {
    expect(isDefinitelyEmptySlot(pixels(32, 32, [150, 150, 150]), 32, 32)).toBe(false);
    expect(isDefinitelyEmptySlot(pixels(32, 32, [50, 20, 20]), 32, 32)).toBe(false);
    const textured = pixels(32, 32, [40, 40, 40]);
    for (let y = 8; y < 20; y++)
      for (let x = 10; x < 20; x++) {
        const i = (y * 32 + x) * 4;
        textured[i] = textured[i + 1] = textured[i + 2] = 95;
      }
    expect(isDefinitelyEmptySlot(textured, 32, 32)).toBe(false);
    expect(isDefinitelyEmptySlot([], 32, 32)).toBe(false);
  });
  it('locates irregular closed equipment frames and excludes an open line', () => {
    const width = 160,
      height = 120,
      data = pixels(width, height, [35, 35, 35]);
    const paint = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      // Muted rarity borders in WebP can be nearly gray.
      data[i] = 110;
      data[i + 1] = 90;
      data[i + 2] = 100;
    };
    for (const [x, y] of [
      [10, 10],
      [80, 65],
    ])
      for (let d = 0; d < 34; d++) {
        paint(x + d, y);
        paint(x + d, y + 33);
        paint(x, y + d);
        paint(x + 33, y + d);
      }
    for (let x = 15; x < 50; x++) paint(x, 90);
    const frames = findEquipmentFrames({ width, height, data });
    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({ left: 10, top: 10, width: 34 });
  });
});
