import type { Line, Worker } from 'tesseract.js';

import { type EnhancementReading, parseEnhancement } from './equipment-reading';
import { binarizeQuantityPixels, readQuantityPixels } from './quantity-pixels';
import { reconcileQuantity } from './quantity-reconciliation';
import { parseVisibleQuantity } from './visible-quantity';

export interface QuantityReading {
  evidence?: 'single' | 'agreement' | 'conflict';
  text: string;
  value: string | null;
  approximate: boolean;
  confidence: number;
}
export interface IconMatch {
  id: number;
  distance: number;
  pixelDistance?: number;
  sharedIcon: boolean;
  refined?: boolean;
  sourceId?: number;
  colorRank?: number;
  colorGap?: number;
  rankScore?: number;
  shapeDistance?: number;
}

interface LegacyIconIndex {
  algorithm: 'dhash-top-v1';
  checksum: string;
  entries: { hash: string; ids: number[] }[];
}
export interface ColorIconIndex {
  algorithm: 'rgb-top-v2';
  checksum: string;
  entries: { rgb: string; ids: number[] }[];
}
export type IconIndex = LegacyIconIndex | ColorIconIndex;

const decodedColors = new WeakMap<ColorIconIndex, { pixels: Uint8Array; ids: number[] }[]>();
// The lower rows may contain the screenshot's quantity overlay.
const colorWeights = Array.from({ length: 192 }, (_, i) => {
  const pixel = Math.floor(i / 3);
  // Pearl marker and enhancement glyphs commonly occupy the upper corner.
  if (Math.floor(pixel / 8) < 2 && pixel % 8 < 4) return 0;
  return i >= 144 ? 0.55 : 1;
});
const colorWeightTotal = colorWeights.reduce<number>((total, weight) => total + weight, 0);
const colorShapePrefilterLimit = 200;

/** Shape and color comparison, tolerant of a small uniform background brightness shift. */
export function colorDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== 192 || b.length !== 192) return Infinity;
  let shift = 0;
  for (let i = 0; i < 192; i++) shift += (a[i] - b[i]) * colorWeights[i];
  shift = Math.max(-24, Math.min(24, shift / colorWeightTotal));
  let distance = 0;
  for (let i = 0; i < 192; i++) distance += Math.abs(a[i] - b[i] - shift) * colorWeights[i];
  return distance / colorWeightTotal;
}

function shapeDistances(a: ArrayLike<number>, b: ArrayLike<number>, size: number, detail = false) {
  if (a.length !== size * size * 3 || b.length !== size * size * 3)
    return { normalized: Infinity, gradient: Infinity };
  const left = new Float64Array(size * size);
  const right = new Float64Array(size * size);
  const active: number[] = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const pixel = y * size + x;
      if (detail ? y < 4 || y >= 14 || (y >= 10 && x >= 5) : y < 2 && x < size / 2) continue;
      active.push(pixel);
      left[pixel] = a[pixel * 3] * 0.2126 + a[pixel * 3 + 1] * 0.7152 + a[pixel * 3 + 2] * 0.0722;
      right[pixel] = b[pixel * 3] * 0.2126 + b[pixel * 3 + 1] * 0.7152 + b[pixel * 3 + 2] * 0.0722;
    }
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const leftValues = active.map((pixel) => left[pixel]);
  const rightValues = active.map((pixel) => right[pixel]);
  const leftMean = mean(leftValues);
  const rightMean = mean(rightValues);
  const standardDeviation = (values: readonly number[], average: number) =>
    Math.sqrt(mean(values.map((value) => (value - average) ** 2))) || 1;
  const leftDeviation = standardDeviation(leftValues, leftMean);
  const rightDeviation = standardDeviation(rightValues, rightMean);
  const normalized = mean(
    active.map((pixel) =>
      Math.abs(
        (left[pixel] - leftMean) / leftDeviation - (right[pixel] - rightMean) / rightDeviation,
      ),
    ),
  );
  const mask = new Set(active);
  const gradients: number[] = [];
  for (const pixel of active) {
    const y = Math.floor(pixel / size);
    const x = pixel % size;
    for (const [nx, ny] of [
      [x + 1, y],
      [x, y + 1],
    ]) {
      if (nx >= size || ny >= size) continue;
      const next = ny * size + nx;
      if (!mask.has(next)) continue;
      gradients.push(
        Math.abs(
          (left[next] - left[pixel]) / leftDeviation -
            (right[next] - right[pixel]) / rightDeviation,
        ),
      );
    }
  }
  return { normalized, gradient: mean(gradients) };
}

export function rankColorSamples(
  samples: readonly Uint8Array[],
  index: ColorIconIndex,
): IconMatch[] {
  let decoded = decodedColors.get(index);
  if (!decoded) {
    decoded = index.entries.map((row) => ({
      pixels: Uint8Array.from(atob(row.rgb), (char) => char.charCodeAt(0)),
      ids: row.ids,
    }));
    decodedColors.set(index, decoded);
  }
  const ranked = decoded
    .map((row) => ({
      row,
      distance: Math.min(...samples.map((sample) => colorDistance(sample, row.pixels))),
    }))
    .filter((row) => row.distance <= 38)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, colorShapePrefilterLimit);
  if (!ranked.length) return [];
  const shaped = ranked.map((row) => {
    const distances = samples.map((sample) => shapeDistances(sample, row.row.pixels, 8));
    const normalized = Math.min(...distances.map((shape) => shape.normalized));
    const gradient = Math.min(...distances.map((shape) => shape.gradient));
    return { ...row, normalized, gradient, shapeDistance: Math.min(normalized, gradient) };
  });
  const normalizedRanks = new Map(
    [...shaped].sort((a, b) => a.normalized - b.normalized).map((row, rank) => [row.row, rank + 1]),
  );
  const gradientRanks = new Map(
    [...shaped].sort((a, b) => a.gradient - b.gradient).map((row, rank) => [row.row, rank + 1]),
  );
  const colorGap = ranked[1] ? ranked[1].distance - ranked[0].distance : 0;
  const candidates = shaped
    .map((row, index) => ({
      ...row,
      colorRank: index + 1,
      shapeRank: Math.min(normalizedRanks.get(row.row)!, gradientRanks.get(row.row)!),
      shapeDistance: row.shapeDistance,
    }))
    .sort(
      (a, b) =>
        Math.min(a.colorRank, a.shapeRank) - Math.min(b.colorRank, b.shapeRank) ||
        a.distance - b.distance,
    )
    .slice(0, 12);
  const matches = new Map<number, IconMatch>();
  for (const entry of candidates)
    for (const id of entry.row.ids) {
      if (!matches.has(id))
        matches.set(id, {
          id,
          distance: entry.distance,
          sharedIcon: entry.row.ids.length > 1,
          sourceId: entry.row.ids[0],
          colorRank: entry.colorRank,
          colorGap,
          rankScore: entry.shapeDistance,
          shapeDistance: entry.shapeDistance,
        });
    }
  return [...matches.values()].slice(0, 100);
}
export interface Crop {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface IconColorSampleProfile {
  crop: Crop;
  heightRatio: number;
}
export function iconColorSampleCrops(crop: Crop): Crop[] {
  const centered = [0, 0.04, 0.07, 0.1, 0.13].map((inset) => ({
    left: crop.left + crop.width * inset,
    top: crop.top + crop.height * inset,
    width: crop.width * (1 - inset * 2),
    height: crop.height * (1 - inset * 2),
  }));
  const horizontalFrame = [0.08, 0.1, 0.12].map((inset) => ({
    left: crop.left + crop.width * inset,
    top: crop.top,
    width: crop.width * (1 - inset),
    height: crop.height,
  }));
  const insetFrame = [0.14, 0.16].map((inset) => ({
    left: crop.left + crop.width * inset,
    top: crop.top + crop.height * inset,
    width: crop.width * (1 - inset),
    height: crop.height * (1 - inset),
  }));
  return [...centered, ...horizontalFrame, ...insetFrame];
}
export function iconColorSampleProfiles(crop: Crop): IconColorSampleProfile[] {
  const profiles = iconColorSampleCrops(crop).map((window) => ({
    crop: window,
    heightRatio: 0.8,
  }));
  const inset = 0.13;
  return [
    ...profiles,
    {
      crop: {
        left: crop.left + crop.width * inset + Math.max(1, Math.round(crop.width * 0.02)),
        top: crop.top + crop.height * inset,
        width: crop.width * (1 - inset * 2),
        height: crop.height * (1 - inset * 2),
      },
      heightRatio: 0.85,
    },
  ];
}
export function iconDetailSampleCrops(crop: Crop): Crop[] {
  return iconColorSampleCrops(crop);
}

/** Compare a catalog icon at plausible BDO slot offsets, excluding the quantity label. */
export function alignedIconPixelDistance(
  screen: ArrayLike<number>,
  screenWidth: number,
  screenHeight: number,
  template: ArrayLike<number>,
  templateWidth: number,
  templateHeight: number,
): number {
  if (
    screen.length !== screenWidth * screenHeight * 4 ||
    template.length !== templateWidth * templateHeight * 4 ||
    templateWidth > screenWidth ||
    templateHeight > screenHeight
  )
    return Infinity;

  const visibleBottom = Math.floor(screenHeight * 0.8);
  const firstX = Math.round(screenWidth * 0.08);
  const firstY = Math.round(screenHeight * 0.08);
  const lastX = Math.min(screenWidth - templateWidth, Math.round(screenWidth * 0.22));
  const lastY = Math.min(screenHeight - templateHeight, Math.round(screenHeight * 0.22));
  const minX = lastX < firstX ? 0 : firstX;
  const minY = lastY < firstY ? 0 : firstY;
  const maxX = lastX < firstX ? screenWidth - templateWidth : lastX;
  const maxY = lastY < firstY ? screenHeight - templateHeight : lastY;
  let best = Infinity;

  for (let offsetY = minY; offsetY <= maxY; offsetY++)
    for (let offsetX = minX; offsetX <= maxX; offsetX++) {
      let sum = 0;
      let compared = 0;
      for (let y = 0; y < templateHeight; y++) {
        const screenY = offsetY + y;
        if (screenY < 2 || screenY >= visibleBottom) continue;
        for (let x = 0; x < templateWidth; x++) {
          const screenX = offsetX + x;
          if (screenX < 2 || screenX >= screenWidth - 2) continue;
          const screenIndex = (screenY * screenWidth + screenX) * 4;
          const templateIndex = (y * templateWidth + x) * 4;
          if (template[templateIndex + 3] < 16) continue;
          sum +=
            Math.abs(screen[screenIndex] - template[templateIndex]) +
            Math.abs(screen[screenIndex + 1] - template[templateIndex + 1]) +
            Math.abs(screen[screenIndex + 2] - template[templateIndex + 2]);
          compared += 3;
        }
      }
      if (compared) best = Math.min(best, sum / compared);
    }
  return best;
}
export function mapQuantityLines(
  lines: readonly Pick<Line, 'text' | 'bbox' | 'confidence'>[],
  count: number,
  stride: number,
): QuantityReading[] {
  return Array.from({ length: count }, (_, row) => {
    const found = lines.filter(
      (line) =>
        line.bbox.y0 >= 0 &&
        line.bbox.y1 >= line.bbox.y0 &&
        Math.floor(line.bbox.y0 / stride) === row &&
        Math.floor(line.bbox.y1 / stride) === row,
    );
    // Joining fragments or a line crossing two cells could fabricate a larger quantity.
    const text = found.length === 1 ? found[0].text.trim() : '';
    const parsed = parseVisibleQuantity(text);
    return {
      text,
      value: parsed?.value ?? null,
      approximate: parsed?.approximate ?? false,
      confidence: found.length === 1 ? found[0].confidence : 0,
    };
  });
}
function popcount(value: number) {
  value -= (value >>> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return (((value + (value >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function keepColorCandidates(refined: readonly IconMatch[], color: readonly IconMatch[]) {
  const refinedMatches = refined.map((match) => ({ ...match, refined: true }));
  const refinedIds = new Set(refinedMatches.map((match) => match.id));
  const colorFallbacks = color
    .filter((match) => !refinedIds.has(match.id))
    .map((match) => ({
      ...match,
      colorRank: undefined,
      rankScore: Math.max(1, match.rankScore ?? 1),
      refined: false,
    }));
  return [...refinedMatches, ...colorFallbacks];
}

export function rankCandidates(
  image: CanvasImageSource,
  crop: Crop,
  index: IconIndex,
): IconMatch[] {
  if (index.algorithm === 'rgb-top-v2') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Leitura de imagens indisponível neste navegador.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const samples: Uint8Array[] = [];
    // Grid borders, screenshot scaling, and quantity text change the visible icon area.
    for (const { crop: window, heightRatio } of iconColorSampleProfiles(crop)) {
      context.fillStyle = '#000';
      context.fillRect(0, 0, 64, 64);
      context.drawImage(
        image,
        window.left,
        window.top,
        window.width,
        Math.max(1, Math.floor(window.height * heightRatio)),
        0,
        0,
        64,
        64,
      );
      // Average pixels explicitly: browser thumbnail resampling differs by engine.
      samples.push(averageRgb(context.getImageData(0, 0, 64, 64).data, 64, 8));
    }
    return rankColorSamples(samples, index);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 9;
  canvas.height = 8;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Leitura de imagens indisponível neste navegador.');
  context.fillStyle = '#000';
  context.fillRect(0, 0, 9, 8);
  context.drawImage(
    image,
    crop.left,
    crop.top,
    crop.width,
    Math.floor(crop.height * 0.8),
    0,
    0,
    9,
    8,
  );
  const pixels = context.getImageData(0, 0, 9, 8).data;
  const gray = Array.from(
    { length: 72 },
    (_, i) => pixels[i * 4] * 0.2126 + pixels[i * 4 + 1] * 0.7152 + pixels[i * 4 + 2] * 0.0722,
  );
  if (Math.max(...gray) - Math.min(...gray) < 12) return [];
  let high = 0,
    low = 0;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const bit = gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1 : 0;
      if (y < 4) high = (high << 1) | bit;
      else low = (low << 1) | bit;
    }
  const top = index.entries
    .map((row) => ({
      row,
      distance:
        popcount(high ^ parseInt(row.hash.slice(0, 8), 16)) +
        popcount(low ^ parseInt(row.hash.slice(8), 16)),
    }))
    .filter((row) => row.distance <= 16)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);
  const matches = new Map<number, IconMatch>();
  for (const [colorRank, entry] of top.entries()) {
    for (const id of entry.row.ids) {
      if (!matches.has(id)) {
        matches.set(id, {
          id,
          distance: entry.distance,
          sharedIcon: entry.row.ids.length > 1,
          colorRank: colorRank + 1,
          colorGap: (top[1]?.distance ?? entry.distance) - top[0].distance,
        });
      }
    }
  }
  return [...matches.values()].slice(0, 100);
}
export function averageRgb(rgba: ArrayLike<number>, size: number, output: number): Uint8Array {
  const result = new Uint8Array(output * output * 3);
  if (size % output || rgba.length !== size * size * 4) return result;
  const step = size / output;
  for (let y = 0; y < output; y++)
    for (let x = 0; x < output; x++)
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = 0; dy < step; dy++)
          for (let dx = 0; dx < step; dx++)
            sum += rgba[((y * step + dy) * size + x * step + dx) * 4 + c];
        result[(y * output + x) * 3 + c] = Math.round(sum / (step * step));
      }
  return result;
}

/** Fetch only shortlisted public icons, compare their detail and reuse them across slots. */
export class IconRefiner {
  private readonly icons = new Map<string, Promise<ImageBitmap | null>>();
  private closed = false;
  private readonly abort = new AbortController();
  private load(url: string) {
    let pending = this.icons.get(url);
    if (!pending) {
      pending = fetch(url, {
        credentials: 'omit',
        signal: AbortSignal.any([AbortSignal.timeout(10000), this.abort.signal]),
      })
        .then(async (response) => {
          if (!response.ok) return null;
          const bitmap = await createImageBitmap(await response.blob());
          if (this.closed || bitmap.width > 512 || bitmap.height > 512) {
            bitmap.close();
            return null;
          }
          return bitmap;
        })
        .catch(() => null);
      this.icons.set(url, pending);
    }
    return pending;
  }
  async refine(
    image: CanvasImageSource,
    crop: Crop,
    matches: IconMatch[],
    url: (id: number) => string,
  ): Promise<IconMatch[]> {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return matches;
    context.imageSmoothingQuality = 'high';
    const sample = (source: CanvasImageSource, c: Crop) => {
      context.fillStyle = '#000';
      context.fillRect(0, 0, 64, 64);
      // Use the same upper icon region for screenshot and catalog. Never scale
      // the screenshot's quantity overlay into the icon descriptor.
      context.drawImage(source, c.left, c.top, c.width, c.height * 0.72, 0, 0, 64, 64);
      return averageRgb(context.getImageData(0, 0, 64, 64).data, 64, 16);
    };
    const samples = iconDetailSampleCrops(crop).map((window) => sample(image, window));
    const sources = [...new Set(matches.map((m) => m.sourceId ?? m.id))];
    const distances = new Map<number, number>();
    const shapeScores = new Map<number, number>();
    const pixelScores = new Map<number, number>();
    const frameWidth = Math.min(128, Math.max(1, Math.round(crop.width)));
    const frameHeight = Math.min(128, Math.max(1, Math.round(crop.height)));
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = frameWidth;
    frameCanvas.height = frameHeight;
    const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });
    if (!frameContext) return matches;
    frameContext.imageSmoothingQuality = 'high';
    frameContext.drawImage(
      image,
      crop.left,
      crop.top,
      crop.width,
      crop.height,
      0,
      0,
      frameWidth,
      frameHeight,
    );
    const framePixels = frameContext.getImageData(0, 0, frameWidth, frameHeight).data;
    const templateCanvas = document.createElement('canvas');
    const templateScales = [0.72, 0.76, 0.82, 0.88, 0.94];

    for (const id of sources.slice(0, 40)) {
      if (this.closed) return [];
      const icon = await this.load(url(id));
      if (!icon) continue;
      const pixels = sample(icon, { left: 0, top: 0, width: icon.width, height: icon.height });
      const shapeDistance = Math.min(
        ...samples.map((s) => {
          const shape = shapeDistances(s, pixels, 16, true);
          return shape.gradient + shape.normalized * 0.25;
        }),
      );
      shapeScores.set(id, shapeDistance);
      let pixelDistance = Infinity;
      for (const scale of templateScales) {
        const size = Math.max(1, Math.round(Math.min(frameWidth, frameHeight) * scale));
        if (size > frameWidth || size > frameHeight) continue;
        templateCanvas.width = size;
        templateCanvas.height = size;
        const templateContext = templateCanvas.getContext('2d', { willReadFrequently: true });
        if (!templateContext) continue;
        templateContext.imageSmoothingEnabled = true;
        templateContext.imageSmoothingQuality = 'high';
        templateContext.drawImage(icon, 0, 0, icon.width, icon.height, 0, 0, size, size);
        pixelDistance = Math.min(
          pixelDistance,
          alignedIconPixelDistance(
            framePixels,
            frameWidth,
            frameHeight,
            templateContext.getImageData(0, 0, size, size).data,
            size,
            size,
          ),
        );
      }
      pixelScores.set(id, pixelDistance);
      distances.set(
        id,
        Math.min(
          ...samples.map((s) => {
            return iconDetailDistance(s, pixels);
          }),
        ),
      );
    }
    // A shape match can preserve an image with distorted color, but the UI still
    // requires separate color evidence before it will preselect an item.
    const shaped: IconMatch[] = matches
      .flatMap((m) => {
        const sourceId = m.sourceId ?? m.id;
        const distance = distances.get(sourceId);
        const rankScore = shapeScores.get(sourceId);
        return distance === undefined || rankScore === undefined
          ? []
          : [{ ...m, distance, rankScore, shapeDistance: rankScore }];
      })
      .sort((a, b) => a.rankScore! - b.rankScore!);
    const pixelRanked = shaped
      .flatMap((match) => {
        const pixelDistance = pixelScores.get(match.sourceId ?? match.id);
        return pixelDistance === undefined || !Number.isFinite(pixelDistance)
          ? []
          : [{ ...match, rankScore: pixelDistance, pixelDistance }];
      })
      .sort((a, b) => a.rankScore! - b.rankScore!);
    const aligned = pixelRanked.filter((match) => match.pixelDistance! <= 60);
    if (aligned.length) return keepColorCandidates(aligned, matches);

    const shapeBest = shaped[0]?.rankScore;
    const shapeRanked = shaped.filter(
      (m) => m.rankScore! <= 0.75 && m.rankScore! <= (shapeBest ?? 0) + 0.04,
    );
    if (shapeRanked.length) return keepColorCandidates(shapeRanked, matches);
    // Keep a color-only fallback for catalog icons whose shape cannot be compared.
    const ranked = matches
      .map((m) => ({ ...m, distance: distances.get(m.sourceId ?? m.id) ?? 100 }))
      .filter((m) => m.distance <= 36)
      .sort((a, b) => a.distance - b.distance);
    const colorRanked = ranked
      .filter((m) => m.distance <= (ranked[0]?.distance ?? 0) + 6)
      .map((m) => ({ ...m, rankScore: m.distance }));
    return keepColorCandidates(colorRanked, matches);
  }
  close() {
    this.closed = true;
    this.abort.abort();
    for (const pending of this.icons.values()) void pending.then((icon) => icon?.close());
    this.icons.clear();
  }
}
export function iconDetailDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== 768 || b.length !== 768) return Infinity;
  let total = 0,
    count = 0;
  for (let i = 0; i < a.length; i++) {
    const pixel = Math.floor(i / 3);
    // Enhancement text/pearl markers and long counters are not icon evidence.
    if (Math.floor(pixel / 16) < 4 || Math.floor(pixel / 16) >= 14) continue;
    if (Math.floor(pixel / 16) >= 10 && pixel % 16 >= 5) continue;
    total += Math.abs(a[i] - b[i]);
    count++;
  }
  return total / count;
}
export function cropCanvas(
  image: CanvasImageSource,
  crop: Crop,
  scale = 3,
  imageSmoothingEnabled = false,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(crop.width * scale);
  canvas.height = Math.ceil(crop.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Leitura de imagens indisponível.');
  // Keep the game's small outlined glyphs intact while enlarging the fallback crop.
  context.imageSmoothingEnabled = imageSmoothingEnabled;
  context.drawImage(
    image,
    crop.left,
    crop.top,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}
export function quantityRetryScale(width: number): number {
  const safeWidth = Math.max(1, width);
  return safeWidth < 40 ? 4 : Math.min(4, 192 / safeWidth);
}
export function shouldRetryQuantityWithSmoothing(
  width: number,
  reading: Pick<QuantityReading, 'text' | 'approximate' | 'confidence'> | null,
): boolean {
  return (
    width < 40 &&
    !!reading?.approximate &&
    reading.confidence < 15 &&
    /^\d{1,2}k$/i.test(reading.text.trim())
  );
}
export class NumberReader {
  constructor(private readonly readPixels: typeof readQuantityPixels = readQuantityPixels) {}
  private worker?: Worker;
  private initializing?: Promise<Worker>;
  private reportProgress?: (progress: number) => void;
  private cancellation = new AbortController();
  private epoch = 0;
  private cancellable<T>(operation: Promise<T>): Promise<T> {
    const signal = this.cancellation.signal;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('A leitura demorou demais.'));
      }, 90_000);
      const cleanup = () => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
      };
      const cancel = () => {
        cleanup();
        reject(new Error('Leitura cancelada.'));
      };
      if (signal.aborted) {
        cancel();
        void operation.catch(() => undefined);
        return;
      }
      signal.addEventListener('abort', cancel, { once: true });
      operation.then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (error) => {
          cleanup();
          reject(error);
        },
      );
    });
  }
  private async getWorker() {
    if (!this.worker) {
      const signal = this.cancellation.signal;
      const epoch = this.epoch;
      this.initializing ??= import('tesseract.js')
        .then(async ({ createWorker, PSM }) => {
          const worker = await createWorker('eng', 1, {
            logger: (event) => {
              if (event.status === 'recognizing text') this.reportProgress?.(event.progress);
            },
          });
          try {
            if (signal.aborted) throw new Error('Leitura cancelada.');
            await worker.setParameters({
              tessedit_char_whitelist: '0123456789.,kKmM',
              tessedit_pageseg_mode: PSM.SINGLE_LINE,
            });
            return worker;
          } catch (error) {
            await worker.terminate();
            throw error;
          }
        })
        .catch((error: unknown) => {
          if (epoch === this.epoch) this.initializing = undefined;
          throw error;
        });
      this.worker = await this.cancellable(this.initializing);
    }
    return this.worker;
  }
  async read(image: CanvasImageSource, crop: Crop): Promise<string> {
    const worker = await this.getWorker();
    const { PSM } = await import('tesseract.js');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: '0123456789.,kKmM',
    });
    const result = await this.cancellable(
      worker.recognize(cropCanvas(image, crop), {}, { text: true }),
    );
    const parsed = parseVisibleQuantity(result.data.text);
    return parsed && !parsed.approximate ? parsed.value : '';
  }
  async readQuantities(
    image: CanvasImageSource,
    crops: readonly Crop[],
    onProgress?: (progress: number) => void,
  ): Promise<QuantityReading[]> {
    const epoch = this.epoch;
    if (!crops.length) return [];
    if (crops.length > 50) throw new Error('Divida a leitura em lotes de até 50 espaços.');
    const local = crops.map((crop): QuantityReading | null => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(crop.width);
      canvas.height = Math.round(crop.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;
      context.imageSmoothingEnabled = false;
      context.drawImage(
        image,
        Math.round(crop.left),
        Math.round(crop.top),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const reading = this.readPixels(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      );
      const parsed = reading && parseVisibleQuantity(reading.text);
      const result =
        reading && parsed
          ? { ...parsed, confidence: Math.min(84, reading.confidence), evidence: 'single' as const }
          : null;
      return result;
    });
    const unresolved = crops.map((_, i) => i);
    const pendingCrops = unresolved.map((i) => crops[i]);
    const scale = Math.min(4, 192 / Math.max(...crops.map((crop) => crop.width)));
    const padding = 12;
    const stride =
      Math.ceil(Math.max(...pendingCrops.map((crop) => crop.height)) * scale) + padding * 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(Math.max(...crops.map((crop) => crop.width)) * scale) + padding * 2;
    canvas.height = stride * pendingCrops.length;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Leitura de imagens indisponível.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    for (const [index, crop] of pendingCrops.entries()) {
      context.drawImage(
        image,
        crop.left,
        crop.top,
        crop.width,
        crop.height,
        padding,
        index * stride + padding,
        crop.width * scale,
        crop.height * scale,
      );
    }
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (const [row, crop] of pendingCrops.entries()) {
      for (let y = row * stride + padding; y < row * stride + padding + crop.height * scale; y++) {
        for (let x = padding; x < padding + crop.width * scale; x++) {
          const i = (y * canvas.width + x) * 4;
          const [r, g, b] = [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]];
          const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
          const ink = luminance >= 130 && Math.max(r, g, b) - Math.min(r, g, b) < 85;
          const value = ink ? 0 : 255;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
        }
      }
    }
    context.putImageData(pixels, 0, 0);
    this.reportProgress = onProgress;
    try {
      const worker = await this.getWorker();
      const { PSM } = await import('tesseract.js');
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: '0123456789.,kKmM',
      });
      const result = await this.cancellable(
        worker.recognize(canvas, {}, { text: true, blocks: true }),
      );
      const lines =
        result.data.blocks?.flatMap((block) => block.paragraphs.flatMap((p) => p.lines)) ?? [];
      const fallback = mapQuantityLines(lines, pendingCrops.length, stride);
      for (const [i, original] of unresolved.entries()) {
        local[original] = reconcileQuantity(local[original], fallback[i]);
      }
      // Sparse-text segmentation can miss isolated short stacks in contact sheets.
      // Retry only unread crops as single lines, reusing the same local worker.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
      const retryStartedAt = performance.now();
      for (const original of unresolved) {
        if (performance.now() - retryStartedAt > 8000) break;
        if (epoch !== this.epoch) throw new Error('Leitura cancelada.');
        if (local[original]?.value && local[original]!.confidence >= 85) continue;
        const crop = crops[original];
        const fallback = cropCanvas(image, crop, quantityRetryScale(crop.width));
        // Larger slot captures retain enough gray levels for a fixed threshold;
        // tiny slots stay grayscale because their antialiased glyphs are fragile.
        if (crop.width >= 45) {
          const fallbackContext = fallback.getContext('2d', { willReadFrequently: true });
          if (fallbackContext) {
            const pixels = fallbackContext.getImageData(0, 0, fallback.width, fallback.height);
            pixels.data.set(binarizeQuantityPixels(pixels.data, 120));
            fallbackContext.putImageData(pixels, 0, 0);
          }
        }
        const single = await this.cancellable(worker.recognize(fallback, {}, { text: true }));
        const parsed = parseVisibleQuantity(single.data.text.trim());
        if (parsed) {
          local[original] = reconcileQuantity(local[original], {
            ...parsed,
            confidence: single.data.confidence,
          });
        }
        if (
          performance.now() - retryStartedAt <= 8000 &&
          shouldRetryQuantityWithSmoothing(crop.width, local[original] ?? null)
        ) {
          const alternate = cropCanvas(image, crop, 5, true);
          const alternateResult = await this.cancellable(
            worker.recognize(alternate, {}, { text: true }),
          );
          const alternateReading = parseVisibleQuantity(alternateResult.data.text.trim());
          if (alternateReading)
            local[original] = reconcileQuantity(local[original], {
              ...alternateReading,
              confidence: alternateResult.data.confidence,
            });
        }
      }
      return local as QuantityReading[];
    } catch {
      if (epoch !== this.epoch) throw new Error('Leitura cancelada.');
      void this.close();
      // Preserve uncorroborated suggestions for review when fallback is unavailable.
      return local.map(
        (reading) => reading ?? { text: '', value: null, approximate: false, confidence: 0 },
      );
    } finally {
      this.reportProgress = undefined;
    }
  }
  async readEnhancements(
    image: CanvasImageSource,
    crops: readonly Crop[],
  ): Promise<(EnhancementReading | null)[]> {
    if (!crops.length) return [];
    if (crops.length > 32) throw new Error('Leia até 32 equipamentos por captura.');
    const epoch = this.epoch;
    const stride = 100,
      padding = 16;
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = stride * crops.length;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return crops.map(() => null);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    crops.forEach((crop, i) =>
      ctx.drawImage(
        image,
        crop.left + crop.width * 0.2,
        crop.top + crop.height * 0.25,
        crop.width * 0.65,
        crop.height * 0.6,
        padding,
        i * stride + padding,
        130,
        60,
      ),
    );
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const [r, g, b] = [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]];
      const ink = Math.max(r, g, b) > 155 && Math.max(r, g, b) - Math.min(r, g, b) < 95;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = ink ? 0 : 255;
    }
    // Preserve the white contact-sheet gutters (white background is not glyph ink).
    for (let row = 0; row < crops.length; row++)
      for (let y = row * stride; y < (row + 1) * stride; y++)
        for (let x = 0; x < canvas.width; x++)
          if (
            x < padding ||
            x >= padding + 130 ||
            y < row * stride + padding ||
            y >= row * stride + padding + 60
          ) {
            const i = (y * canvas.width + x) * 4;
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
          }
    ctx.putImageData(pixels, 0, 0);
    try {
      const worker = await this.getWorker();
      const { PSM } = await import('tesseract.js');
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: 'IVX+0123456789',
      });
      const result = await this.cancellable(
        worker.recognize(canvas, {}, { text: true, blocks: true }),
      );
      const lines =
        result.data.blocks?.flatMap((block) => block.paragraphs.flatMap((p) => p.lines)) ?? [];
      return crops.map((_, i) => {
        const row = lines.filter(
          (line) =>
            line.bbox.y0 >= i * stride + padding && line.bbox.y1 <= i * stride + padding + 60,
        );
        return row.length === 1 && row[0].confidence >= 55 ? parseEnhancement(row[0].text) : null;
      });
    } catch {
      if (epoch !== this.epoch) throw new Error('Leitura cancelada.');
      await this.close();
      return crops.map(() => null);
    }
  }
  async close() {
    this.epoch++;
    this.cancellation.abort();
    const pending = this.initializing;
    const current = this.worker;
    this.worker = undefined;
    this.initializing = undefined;
    this.cancellation = new AbortController();
    const worker = current ?? (await pending?.catch(() => undefined));
    await worker?.terminate();
  }
}
