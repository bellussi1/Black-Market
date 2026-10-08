import type { Worker } from 'tesseract.js';

export interface IconIndex {
  algorithm: 'dhash-top-v1';
  checksum: string;
  entries: { hash: string; ids: number[] }[];
}
export interface Crop {
  left: number;
  top: number;
  width: number;
  height: number;
}
function popcount(value: number) {
  value -= (value >>> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return (((value + (value >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}
export function candidates(image: CanvasImageSource, crop: Crop, index: IconIndex): number[] {
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
  return [...new Set(top.flatMap((entry) => entry.row.ids))].slice(0, 100);
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
  async read(image: CanvasImageSource, crop: Crop): Promise<string> {
    if (!this.worker) {
      this.initializing ??= import('tesseract.js').then(async ({ createWorker, PSM }) => {
        const worker = await createWorker('eng', 1, { logger: () => undefined });
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789.,',
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });
        return worker;
      });
      this.worker = await this.initializing;
    }
    const result = await this.worker.recognize(cropCanvas(image, crop), {}, { text: true });
    const text = result.data.text.trim();
    return /^\d+(?:[.,]\d+)*$/.test(text) ? text : '';
  }
  async close() {
    const worker = this.worker ?? (await this.initializing?.catch(() => undefined));
    await worker?.terminate();
    this.worker = undefined;
    this.initializing = undefined;
  }
}
