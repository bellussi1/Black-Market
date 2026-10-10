import { describe, expect, it } from 'vitest';

import { findEquipmentFrames } from './equipment-slots';
import { isDefinitelyEmptySlot, isKnownLockedSlot } from './slot-visibility';
const pixels = (width: number, height: number, rgb: number[]) =>
  Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) =>
    i % 4 === 3 ? 255 : rgb[i % 4],
  );
describe('Slot visibility and equipment frames', () => {
  it('recognizes the muted warehouse padlock without treating a gray item as empty', () => {
    // Read-only pixel sample from the attached 14-storage.png slot at x515/y163.
    const rows = [
      [35, 32, 32, 33, 32, 32, 32, 33, 32, 32, 33, 33, 33, 32, 38, 46],
      [36, 33, 33, 33, 34, 35, 45, 47, 35, 34, 34, 34, 34, 33, 39, 47],
      [37, 34, 34, 34, 33, 53, 50, 46, 58, 36, 35, 35, 35, 34, 39, 47],
      [38, 34, 34, 35, 37, 54, 42, 39, 54, 40, 35, 35, 35, 35, 40, 47],
      [39, 36, 36, 36, 53, 68, 66, 68, 66, 56, 36, 37, 37, 37, 41, 48],
      [40, 37, 37, 37, 59, 70, 59, 55, 70, 60, 37, 38, 38, 38, 42, 48],
      [41, 38, 38, 38, 58, 71, 60, 55, 70, 62, 38, 38, 39, 39, 43, 49],
      [41, 39, 39, 39, 57, 71, 69, 68, 71, 62, 40, 40, 40, 40, 43, 49],
      [43, 40, 40, 40, 43, 46, 47, 48, 48, 45, 41, 41, 41, 41, 45, 49],
      [44, 41, 41, 41, 41, 42, 41, 42, 42, 42, 43, 42, 42, 42, 46, 48],
      [45, 42, 42, 43, 43, 43, 42, 42, 43, 43, 44, 43, 43, 43, 46, 48],
      [45, 42, 43, 44, 44, 43, 43, 43, 44, 44, 44, 44, 44, 45, 46, 47],
      [50, 49, 51, 51, 51, 51, 50, 50, 51, 51, 52, 52, 52, 53, 53, 49],
      [41, 40, 41, 41, 42, 42, 42, 42, 44, 44, 44, 44, 44, 44, 44, 41],
      [43, 43, 45, 44, 45, 46, 46, 47, 47, 47, 48, 47, 47, 47, 48, 43],
      [43, 41, 43, 42, 43, 43, 43, 43, 43, 43, 44, 44, 44, 43, 46, 49],
    ];
    const locked = Uint8ClampedArray.from(
      rows.flatMap((row) => row.flatMap((v) => [v, v, v, 255])),
    );
    expect(isKnownLockedSlot(locked, 16, 16)).toBe(true);
    const shifted = pixels(16, 16, [35, 35, 35]);
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < 15; x++)
        shifted.set(
          locked.slice((y * 16 + x) * 4, (y * 16 + x) * 4 + 4),
          ((y + 2) * 16 + x + 1) * 4,
        );
    expect(isKnownLockedSlot(shifted, 16, 16)).toBe(true);
    expect(isKnownLockedSlot(pixels(32, 32, [40, 40, 40]), 32, 32)).toBe(false);
    expect(isKnownLockedSlot(pixels(32, 32, [50, 20, 20]), 32, 32)).toBe(false);
    const item = pixels(32, 32, [35, 35, 35]);
    for (let y = 8; y < 24; y++)
      for (let x = 6; x < 23; x++) {
        const i = (y * 32 + x) * 4;
        item[i] = item[i + 1] = item[i + 2] = 150;
      }
    expect(isKnownLockedSlot(item, 32, 32)).toBe(false);
    expect(isKnownLockedSlot([], 32, 32)).toBe(false);
  });
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
