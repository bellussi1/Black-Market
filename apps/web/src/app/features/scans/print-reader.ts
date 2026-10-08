import type { Line, Worker } from 'tesseract.js';

import { readQuantityPixels } from './quantity-pixels';
import { parseVisibleQuantity } from './visible-quantity';

export interface QuantityReading {
  text: string;
  value: string | null;
  approximate: boolean;
  confidence: number;
}
export interface IconMatch {
  id: number;
  distance: number;
  sharedIcon: boolean;
  sourceId?: number;
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
const colorWeights = Array.from({ length: 192 }, (_, i) => (i >= 144 ? 0.55 : 1));
const colorWeightTotal = colorWeights.reduce((total, weight) => total + weight, 0);

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
    .slice(0, 12);
  const matches = new Map<number, IconMatch>();
  for (const entry of ranked)
    for (const id of entry.row.ids) {
      if (!matches.has(id))
        matches.set(id, {
          id,
          distance: entry.distance,
          sharedIcon: entry.row.ids.length > 1,
          sourceId: entry.row.ids[0],
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
    // Screenshot frames and UI scaling change the visible icon inset.
    for (const inset of [0, 0.04, 0.07, 0.1, 0.13]) {
      context.fillStyle = '#000';
      context.fillRect(0, 0, 64, 64);
      const width = crop.width * (1 - inset * 2),
        height = crop.height * (1 - inset * 2);
      context.drawImage(
        image,
        crop.left + crop.width * inset,
        crop.top + crop.height * inset,
        width,
        Math.max(1, Math.floor(height * 0.8)),
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
  for (const entry of top) {
    for (const id of entry.row.ids) {
      if (!matches.has(id)) {
        matches.set(id, { id, distance: entry.distance, sharedIcon: entry.row.ids.length > 1 });
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
      context.drawImage(source, c.left, c.top, c.width, c.height, 0, 0, 64, 64);
      return averageRgb(context.getImageData(0, 0, 64, 64).data, 64, 16);
    };
    const samples = [0.04, 0.07, 0.1, 0.13].map((inset) =>
      sample(image, {
        left: crop.left + crop.width * inset,
        top: crop.top + crop.height * inset,
        width: crop.width * (1 - inset * 2),
        height: crop.height * (1 - inset * 2),
      }),
    );
    const sources = [...new Set(matches.map((m) => m.sourceId ?? m.id))];
    const distances = new Map<number, number>();
    for (const id of sources) {
      if (this.closed) return [];
      const icon = await this.load(url(id));
      if (!icon) continue;
      const pixels = sample(icon, { left: 0, top: 0, width: icon.width, height: icon.height });
      distances.set(
        id,
        Math.min(
          ...samples.map((s) => {
            return iconDetailDistance(s, pixels);
          }),
        ),
      );
    }
    // Never turn a failed image request into a confident automatic selection.
    const ranked = matches
      .map((m) => ({ ...m, distance: distances.get(m.sourceId ?? m.id) ?? 100 }))
      .filter((m) => m.distance <= 36)
      .sort((a, b) => a.distance - b.distance);
    return ranked.filter((m) => m.distance <= (ranked[0]?.distance ?? 0) + 6);
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
    // Preserve bottom-left silhouettes, but ignore the quantity at the bottom-right.
    if (Math.floor(pixel / 16) >= 10 && pixel % 16 >= 5) continue;
    total += Math.abs(a[i] - b[i]);
    count++;
  }
  return total / count;
}
export function cropCanvas(image: CanvasImageSource, crop: Crop, scale = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(crop.width * scale);
  canvas.height = Math.ceil(crop.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Leitura de imagens indisponível.');
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
export class NumberReader {
  private worker?: Worker;
  private initializing?: Promise<Worker>;
  private reportProgress?: (progress: number) => void;
  private async getWorker() {
    if (!this.worker) {
      this.initializing ??= import('tesseract.js')
        .then(async ({ createWorker, PSM }) => {
          const worker = await createWorker('eng', 1, {
            logger: (event) => {
              if (event.status === 'recognizing text') this.reportProgress?.(event.progress);
            },
          });
          try {
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
          this.initializing = undefined;
          throw error;
        });
      this.worker = await this.initializing;
    }
    return this.worker;
  }
  async read(image: CanvasImageSource, crop: Crop): Promise<string> {
    const worker = await this.getWorker();
    const { PSM } = await import('tesseract.js');
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
    const result = await worker.recognize(cropCanvas(image, crop), {}, { text: true });
    const parsed = parseVisibleQuantity(result.data.text);
    return parsed && !parsed.approximate ? parsed.value : '';
  }
  async readQuantities(
    image: CanvasImageSource,
    crops: readonly Crop[],
    onProgress?: (progress: number) => void,
  ): Promise<QuantityReading[]> {
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
      const reading = readQuantityPixels(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      );
      const parsed = reading && parseVisibleQuantity(reading.text);
      return reading && parsed ? { ...parsed, confidence: reading.confidence } : null;
    });
    const unresolved = crops.map((_, i) => i).filter((i) => !local[i]);
    if (!unresolved.length) {
      onProgress?.(1);
      return local as QuantityReading[];
    }
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
    const worker = await this.getWorker();
    const { PSM } = await import('tesseract.js');
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    this.reportProgress = onProgress;
    try {
      const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const lines =
        result.data.blocks?.flatMap((block) => block.paragraphs.flatMap((p) => p.lines)) ?? [];
      const fallback = mapQuantityLines(lines, pendingCrops.length, stride);
      for (const [i, original] of unresolved.entries()) local[original] = fallback[i];
      return local as QuantityReading[];
    } finally {
      this.reportProgress = undefined;
    }
  }
  async close() {
    const worker = this.worker ?? (await this.initializing?.catch(() => undefined));
    await worker?.terminate();
    this.worker = undefined;
    this.initializing = undefined;
  }
}
