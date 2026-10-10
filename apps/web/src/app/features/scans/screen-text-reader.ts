import { inject, Injectable, InjectionToken } from '@angular/core';
import type { Worker } from 'tesseract.js';

import type { Crop } from './print-reader';
import { type OcrTextLine, screenOcrScale } from './screen-recognition';

export type ScreenWorkerFactory = (onProgress: (progress: number) => void) => Promise<Worker>;

export const SCREEN_TEXT_WORKER_FACTORY = new InjectionToken<ScreenWorkerFactory>(
  'SCREEN_TEXT_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () => async (onProgress) => {
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('por', 1, {
        logger: (event) => {
          if (event.status === 'recognizing text') onProgress(event.progress);
        },
      });
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: '1',
        });
        return worker;
      } catch (error) {
        await worker.terminate();
        throw error;
      }
    },
  },
);

function imageDimensions(image: CanvasImageSource): { width: number; height: number } {
  const source = image as CanvasImageSource & {
    height?: number;
    naturalHeight?: number;
    naturalWidth?: number;
    videoHeight?: number;
    videoWidth?: number;
    width?: number;
  };
  const width = source.naturalWidth || source.videoWidth || source.width || 0;
  const height = source.naturalHeight || source.videoHeight || source.height || 0;
  if (!width || !height) throw new Error('A imagem não tem dimensões legíveis.');
  return { width, height };
}

function canvasSource(image: CanvasImageSource): {
  canvas: HTMLCanvasElement;
  scaleX: number;
  scaleY: number;
} {
  const { width, height } = imageDimensions(image);
  const scale = screenOcrScale(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Leitura de imagens indisponível neste navegador.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, scaleX: canvas.width / width, scaleY: canvas.height / height };
}

function mapLine(
  line: {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  },
  scaleX: number,
  scaleY: number,
): OcrTextLine | null {
  const text = line.text.trim();
  const bounds: Crop = {
    left: Math.max(0, line.bbox.x0 / scaleX),
    top: Math.max(0, line.bbox.y0 / scaleY),
    width: Math.max(0, (line.bbox.x1 - line.bbox.x0) / scaleX),
    height: Math.max(0, (line.bbox.y1 - line.bbox.y0) / scaleY),
  };
  return text && bounds.width > 0 && bounds.height > 0
    ? { text, confidence: Math.max(0, Math.min(100, line.confidence)), bounds }
    : null;
}

function cancellable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => finish(new Error('A leitura demorou demais.')), 90_000);
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    };
    const finish = (error?: unknown, value?: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(value as T);
    };
    const abort = () => finish(new Error('Leitura cancelada.'));
    if (signal.aborted) {
      abort();
      void operation.catch(() => undefined);
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    operation.then(
      (value) => finish(undefined, value),
      (error) => finish(error),
    );
  });
}

@Injectable({ providedIn: 'root' })
export class ScreenTextReader {
  private readonly workerFactory = inject(SCREEN_TEXT_WORKER_FACTORY);
  private worker?: Worker;
  private initializing?: Promise<Worker>;
  private cancellation = new AbortController();
  private epoch = 0;
  private progressEpoch = 0;

  private async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    const epoch = this.epoch;
    const signal = this.cancellation.signal;
    const initializing = (this.initializing ??= this.workerFactory((progress) => {
      if (epoch === this.epoch && epoch === this.progressEpoch) this.reportProgress?.(progress);
    }));
    try {
      const pending = initializing.then(async (worker) => {
        if (epoch !== this.epoch) {
          await worker.terminate();
          throw new Error('Leitura cancelada.');
        }
        return worker;
      });
      const worker = await cancellable(pending, signal);
      if (epoch !== this.epoch) {
        await worker.terminate();
        throw new Error('Leitura cancelada.');
      }
      this.worker = worker;
      return worker;
    } catch (error) {
      if (this.initializing === initializing) this.initializing = undefined;
      throw error;
    }
  }

  private reportProgress?: (progress: number) => void;

  async read(
    image: CanvasImageSource,
    onProgress?: (progress: number) => void,
  ): Promise<OcrTextLine[]> {
    const epoch = this.epoch;
    const signal = this.cancellation.signal;
    this.reportProgress = (progress) =>
      onProgress?.(Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)));
    this.progressEpoch = epoch;
    try {
      const worker = await this.getWorker();
      const source = canvasSource(image);
      const result = await cancellable(
        worker.recognize(source.canvas, {}, { text: true, blocks: true }),
        signal,
      );
      if (epoch !== this.epoch) throw new Error('Leitura cancelada.');
      const lines =
        result.data.blocks?.flatMap((block) =>
          block.paragraphs.flatMap((paragraph) => paragraph.lines),
        ) ?? [];
      return lines
        .map((line) => mapLine(line, source.scaleX, source.scaleY))
        .filter((line): line is OcrTextLine => line !== null);
    } catch (error) {
      if (
        epoch === this.epoch &&
        error instanceof Error &&
        error.message === 'A leitura demorou demais.'
      )
        await this.close();
      throw error;
    } finally {
      if (epoch === this.epoch) this.reportProgress = undefined;
    }
  }

  async close(): Promise<void> {
    this.epoch++;
    this.cancellation.abort();
    this.reportProgress = undefined;
    this.progressEpoch = this.epoch;
    const worker = this.worker;
    this.worker = undefined;
    this.initializing = undefined;
    this.cancellation = new AbortController();
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Cancellation still returns the image to the manual review flow.
      }
    }
  }
}
