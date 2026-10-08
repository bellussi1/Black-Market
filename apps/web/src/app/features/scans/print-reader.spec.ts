import { describe, expect, it, vi } from 'vitest';

import {
  averageRgb,
  colorDistance,
  type ColorIconIndex,
  iconDetailDistance,
  IconRefiner,
  rankColorSamples,
} from './print-reader';

const color = (r: number, g: number, b: number) =>
  Uint8Array.from({ length: 192 }, (_, i) => [r, g, b][i % 3]);
const entry = (pixels: Uint8Array, ids: number[]) => ({
  rgb: btoa(String.fromCharCode(...pixels)),
  ids,
});

describe('Color icon comparison', () => {
  it('ignores the numeric overlay but preserves the lower-left icon shape', () => {
    const source = new Uint8Array(768),
      changed = source.slice();
    changed[(15 * 16 + 15) * 3] = 255;
    expect(iconDetailDistance(source, changed)).toBe(0);
    changed[(15 * 16 + 1) * 3] = 255;
    expect(iconDetailDistance(source, changed)).toBeGreaterThan(0);
    expect(iconDetailDistance(new Uint8Array(1), changed)).toBe(Infinity);
  });
  it('reuses public icon downloads and releases decoded images after reading', async () => {
    const bitmap = { width: 48, height: 48, close: vi.fn() };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob() });
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8Array(64 * 64 * 4) }),
    } as unknown as CanvasRenderingContext2D);
    const refiner = new IconRefiner(),
      crop = { left: 0, top: 0, width: 48, height: 48 };
    const matches = [
      { id: 1, distance: 20, sharedIcon: true, sourceId: 1 },
      { id: 2, distance: 20, sharedIcon: true, sourceId: 1 },
    ];
    expect(
      (await refiner.refine({} as CanvasImageSource, crop, matches, () => '/public-icon')).map(
        (m) => m.id,
      ),
    ).toEqual([1, 2]);
    await refiner.refine({} as CanvasImageSource, crop, matches, () => '/public-icon');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit' });
    refiner.close();
    await Promise.resolve();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it('keeps failed public icon downloads out of confident suggestions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8Array(64 * 64 * 4) }),
    } as unknown as CanvasRenderingContext2D);
    const refiner = new IconRefiner();
    expect(
      await refiner.refine(
        {} as CanvasImageSource,
        { left: 0, top: 0, width: 48, height: 48 },
        [{ id: 1, distance: 1, sharedIcon: false }],
        () => '/unavailable',
      ),
    ).toEqual([]);
    refiner.close();
  });
  it('averages a whole pixel area instead of choosing one aliased thumbnail pixel', () => {
    const rgba = Uint8Array.from(
      { length: 16 },
      (_, i) => [0, 0, 0, 255, 100, 0, 0, 255, 0, 100, 0, 255, 0, 0, 100, 255][i],
    );
    expect([...averageRgb(rgba, 2, 1)]).toEqual([25, 25, 25]);
  });
  it('does not fetch icons or fabricate confident matches after cancellation', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8Array(64 * 64 * 4) }),
    } as unknown as CanvasRenderingContext2D);
    const refiner = new IconRefiner();
    refiner.close();
    expect(
      await refiner.refine(
        {} as CanvasImageSource,
        { left: 0, top: 0, width: 48, height: 48 },
        [{ id: 1, distance: 1, sharedIcon: false }],
        () => '/icon',
      ),
    ).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
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
