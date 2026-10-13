import { describe, expect, it, vi } from 'vitest';

import {
  averageRgb,
  colorDistance,
  type ColorIconIndex,
  cropCanvas,
  iconColorSampleCrops,
  iconDetailDistance,
  iconDetailSampleCrops,
  IconRefiner,
  quantityRetryScale,
  rankColorSamples,
  shouldRetryQuantityWithSmoothing,
} from './print-reader';

const color = (r: number, g: number, b: number) =>
  Uint8Array.from({ length: 192 }, (_, i) => [r, g, b][i % 3]);
const entry = (pixels: Uint8Array, ids: number[]) => ({
  rgb: btoa(String.fromCharCode(...pixels)),
  ids,
});

describe('Color icon comparison', () => {
  it('samples asymmetric grid insets as well as the centered icon area', () => {
    const crops = iconColorSampleCrops({ left: 10, top: 20, width: 100, height: 50 });

    expect(crops).toHaveLength(10);
    expect(crops).toContainEqual({ left: 18, top: 20, width: 92, height: 50 });
    expect(crops).toContainEqual({ left: 24, top: 27, width: 86, height: 43 });
  });
  it('keeps asymmetric slot profiles available to the detail refiner', () => {
    const crops = iconDetailSampleCrops({ left: 10, top: 20, width: 100, height: 50 });

    expect(crops).toContainEqual({ left: 18, top: 20, width: 92, height: 50 });
    expect(crops).toContainEqual({ left: 24, top: 27, width: 86, height: 43 });
  });
  it('ignores the numeric overlay but preserves the lower-left icon shape', () => {
    const source = new Uint8Array(768),
      changed = source.slice();
    changed[(15 * 16 + 15) * 3] = 255;
    expect(iconDetailDistance(source, changed)).toBe(0);
    changed[(3 * 16 + 8) * 3] = 255;
    expect(iconDetailDistance(source, changed)).toBe(0);
    changed[(12 * 16 + 1) * 3] = 255;
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
  it('keeps a matching silhouette when color-only ranking would hide it below twelve', () => {
    const screenshot = new Uint8Array(192);
    for (let pixel = 0; pixel < 64; pixel++) {
      const value = 35 + (pixel % 8) * 17 + Math.floor(pixel / 8) * 5;
      screenshot[pixel * 3] = screenshot[pixel * 3 + 1] = screenshot[pixel * 3 + 2] = value;
    }
    const colorDistractors = Array.from({ length: 13 }, (_, i) => {
      const pixels = screenshot.slice();
      pixels[((i * 7 + 11) % 64) * 3] = 0;
      return entry(pixels, [100 + i]);
    });
    const sameSilhouette = screenshot.slice();
    for (let pixel = 0; pixel < 64; pixel++) {
      sameSilhouette[pixel * 3] += 20;
      sameSilhouette[pixel * 3 + 1] -= 6;
      sameSilhouette[pixel * 3 + 2] -= 14;
    }
    const result = rankColorSamples([screenshot], {
      algorithm: 'rgb-top-v2',
      checksum: 'c'.repeat(64),
      entries: [...colorDistractors, entry(sameSilhouette, [999])],
    });

    expect(result.map((row) => row.id)).toContain(999);
  });
  it('keeps a matching silhouette beyond the first hundred color candidates', () => {
    const screenshot = new Uint8Array(192);
    for (let pixel = 0; pixel < 64; pixel++) {
      const value = 35 + (pixel % 8) * 17 + Math.floor(pixel / 8) * 5;
      screenshot[pixel * 3] = screenshot[pixel * 3 + 1] = screenshot[pixel * 3 + 2] = value;
    }
    const colorDistractors = Array.from({ length: 101 }, (_, i) => {
      const pixels = screenshot.slice();
      pixels.fill(0, (16 + (i % 48)) * 3, (16 + (i % 48)) * 3 + 3);
      return entry(pixels, [100 + i]);
    });
    const sameSilhouette = screenshot.slice();
    for (let pixel = 0; pixel < 64; pixel++) {
      sameSilhouette[pixel * 3] += 20;
      sameSilhouette[pixel * 3 + 1] -= 6;
      sameSilhouette[pixel * 3 + 2] -= 14;
    }
    const result = rankColorSamples([screenshot], {
      algorithm: 'rgb-top-v2',
      checksum: 'd'.repeat(64),
      entries: [...colorDistractors, entry(sameSilhouette, [999])],
    });

    expect(result.map((row) => row.id)).toContain(999);
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
describe('Quantity retry scaling', () => {
  it('allows the narrow-label retry to smooth only its fallback crop', () => {
    const context = { imageSmoothingEnabled: false, drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    cropCanvas({} as CanvasImageSource, { left: 0, top: 0, width: 33, height: 13 }, 5, true);

    expect(context.imageSmoothingEnabled).toBe(true);
    expect(context.drawImage).toHaveBeenCalledOnce();
  });
  it('uses a measured scale for narrow labels while capping enlargement', () => {
    expect(quantityRetryScale(33)).toBe(4);
    expect(quantityRetryScale(52)).toBeCloseTo(192 / 52);
    expect(quantityRetryScale(20)).toBe(4);
  });
  it('retries only weak short abbreviated values with a smoothed view', () => {
    expect(
      shouldRetryQuantityWithSmoothing(33, {
        text: '31k',
        approximate: true,
        confidence: 0,
      }),
    ).toBe(true);
    expect(
      shouldRetryQuantityWithSmoothing(33, {
        text: '146k',
        approximate: true,
        confidence: 39,
      }),
    ).toBe(false);
    expect(
      shouldRetryQuantityWithSmoothing(52, {
        text: '31k',
        approximate: true,
        confidence: 0,
      }),
    ).toBe(false);
  });
});
