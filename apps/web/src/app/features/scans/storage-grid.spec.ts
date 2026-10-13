import { describe, expect, it } from 'vitest';

import { detectGridAreas, detectGridPixels, storageGridAnalysisScale } from './storage-grid';

function sample(pitch: number, cropped = false, columns = 9, rows = 10) {
  const left = cropped ? 0 : Math.round(pitch * 4.5);
  const top = cropped ? 0 : pitch * 2;
  const width = left + columns * pitch + (cropped ? 0 : pitch);
  const height = top + rows * pitch + (cropped ? 0 : pitch * 2);
  const data = new Uint8ClampedArray(width * height * 4);
  const put = (x: number, y: number, color: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = color;
    data[i + 3] = 255;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) put(x, y, 52);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      for (let y = 0; y < pitch; y++)
        for (let x = 0; x < pitch; x++) {
          const border =
            ((x === 3 || x === pitch - 4) && y >= 3 && y <= pitch - 4) ||
            ((y === 3 || y === pitch - 4) && x >= 3 && x <= pitch - 4);
          const icon = x > pitch * 0.25 && x < pitch * 0.7 && y > pitch * 0.2 && y < pitch * 0.65;
          put(
            left + col * pitch + x,
            top + row * pitch + y,
            border ? 140 : icon ? 70 + ((row * 7 + col * 11 + x + y) % 65) : 20,
          );
        }
    }
  return { data, width, height, channels: 4 as const, left, top, columns, rows };
}

describe('Storage grid detection', () => {
  it('normalizes screenshots to the 1100px analysis limit', () => {
    expect(storageGridAnalysisScale(800, 600)).toBe(1);
    expect(storageGridAnalysisScale(1265, 935)).toBeCloseTo(1100 / 1265);
    expect(storageGridAnalysisScale(1600, 900)).toBeCloseTo(1100 / 1600);
    expect(storageGridAnalysisScale(3200, 1800)).toBeCloseTo(1100 / 3200);
  });

  it('covers a wide warehouse with more than 100 slots without dropping its last columns', () => {
    const frame = sample(41, false, 19, 10);
    const grid = detectGridPixels(frame);
    expect(grid).toMatchObject({ columns: 19, rows: 10 });
    expect(Math.abs(grid!.bounds.width - 19 * 41)).toBeLessThanOrEqual(4);
  });
  it('keeps neighboring panes separate and offers both areas', () => {
    const first = sample(40),
      second = sample(40, true);
    const width = 1100,
      height = first.height,
      left = 650;
    const data = new Uint8ClampedArray(width * height * 4).fill(52);
    for (let y = 0; y < height; y++)
      data.set(first.data.slice(y * first.width * 4, (y + 1) * first.width * 4), y * width * 4);
    for (let y = 0; y < second.height; y++)
      data.set(
        second.data.slice(y * second.width * 4, (y + 1) * second.width * 4),
        ((y + first.top) * width + left) * 4,
      );
    const grids = detectGridAreas({ data, width, height, channels: 4 });
    expect(grids).toHaveLength(2);
    expect(grids.every((grid) => grid.columns === 9 && grid.rows === 10)).toBe(true);
    expect(grids.some((grid) => Math.abs(grid.bounds.left - first.left) <= 4)).toBe(true);
    expect(grids.some((grid) => Math.abs(grid.bounds.left - left) <= 4)).toBe(true);
  });
  it.each([28, 45, 64])('isolates a regular 9 × 10 grid at %s pixel scale', (pitch) => {
    const frame = sample(pitch);
    const result = detectGridPixels(frame);
    expect(result).toMatchObject({ columns: frame.columns, rows: frame.rows });
    expect(Math.abs(result!.bounds.left - frame.left)).toBeLessThanOrEqual(4);
    expect(Math.abs(result!.bounds.top - frame.top)).toBeLessThanOrEqual(4);
  });
  it('preserves outer cells when the picture is already cropped to the grid', () => {
    const frame = sample(45, true);
    expect(detectGridPixels(frame)).toEqual({
      columns: 9,
      rows: 10,
      bounds: { left: 0, top: 0, width: frame.width, height: frame.height },
    });
  });
  it('does not infer a grid or one-unit quantities from a uniform picture', () => {
    const data = new Uint8ClampedArray(320 * 240 * 4).fill(60);
    expect(detectGridPixels({ data, width: 320, height: 240, channels: 4 })).toBeNull();
  });
  it('supports full HD 1080p frame resolution without aborting', () => {
    const width = 1920,
      height = 1080;
    const s = sample(50, false, 9, 8);
    const data = new Uint8ClampedArray(width * height * 4).fill(52);
    for (let y = 0; y < s.height; y++)
      data.set(s.data.slice(y * s.width * 4, (y + 1) * s.width * 4), (y * width + 200) * 4);
    const grid = detectGridPixels({ data, width, height, channels: 4 });
    expect(grid).not.toBeNull();
    expect(grid).toMatchObject({ columns: 9, rows: 8 });
  });
  it('refuses incomplete or oversized pixel buffers before allocating', () => {
    expect(detectGridPixels({ data: [], width: 920, height: 731, channels: 4 })).toBeNull();
    expect(detectGridPixels({ data: [], width: 10000, height: 10000, channels: 4 })).toBeNull();
  });
});
