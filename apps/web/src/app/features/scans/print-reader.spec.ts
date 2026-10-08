import { describe, expect, it } from 'vitest';

import { colorDistance, type ColorIconIndex, rankColorSamples } from './print-reader';

const color = (r: number, g: number, b: number) =>
  Uint8Array.from({ length: 192 }, (_, i) => [r, g, b][i % 3]);
const entry = (pixels: Uint8Array, ids: number[]) => ({
  rgb: btoa(String.fromCharCode(...pixels)),
  ids,
});

describe('Color icon comparison', () => {
  it('distinguishes differently colored icons with the same silhouette and keeps shared IDs', () => {
    const red = color(150, 30, 30),
      blue = color(30, 30, 150);
    const index: ColorIconIndex = {
      algorithm: 'rgb-top-v2',
      checksum: 'a'.repeat(64),
      entries: [entry(blue, [5]), entry(red, [6201, 6202])],
    };
    const result = rankColorSamples([red], index);
    expect(result.map((row) => row.id)).toEqual([6201, 6202]);
    expect(result.every((row) => row.sharedIcon)).toBe(true);
  });
  it('tolerates a small uniform brightness shift without discarding chromatic differences', () => {
    expect(colorDistance(color(160, 40, 40), color(150, 30, 30))).toBeCloseTo(0, 10);
    expect(colorDistance(color(30, 30, 150), color(150, 30, 30))).toBeGreaterThan(38);
    expect(colorDistance(new Uint8Array(1), color(150, 30, 30))).toBe(Infinity);
  });
  it('compares alternative crop insets and refuses distant or missing candidates', () => {
    const index: ColorIconIndex = {
      algorithm: 'rgb-top-v2',
      checksum: 'b'.repeat(64),
      entries: [entry(color(150, 30, 30), [6201])],
    };
    expect(rankColorSamples([color(30, 30, 150), color(150, 30, 30)], index)[0].id).toBe(6201);
    expect(rankColorSamples([color(30, 30, 150)], index)).toEqual([]);
    expect(rankColorSamples([], index)).toEqual([]);
  });
});
