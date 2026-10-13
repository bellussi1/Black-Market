import type { Crop } from './print-reader';

export interface GridDetection {
  bounds: Crop;
  columns: number;
  rows: number;
}

const maxGridAnalysisDimension = 1100;

/** Normalize sampling so detected slot and quantity crops stay aligned across resolutions. */
export function storageGridAnalysisScale(width: number, height: number): number {
  return Math.min(1, maxGridAnalysisDimension / Math.max(width, height));
}

interface PixelFrame {
  data: ArrayLike<number>;
  width: number;
  height: number;
  channels: 3 | 4;
}
interface Valley {
  position: number;
  strength: number;
}
interface Run {
  start: number;
  end: number;
  step: number;
  cells: number;
  strength: number;
}

function gridRuns(profile: number[], expectedStep?: number): Run[] {
  const valleys: Valley[] = [];
  for (let i = 6; i < profile.length - 6; i++) {
    if (profile[i] > profile[i - 1] || profile[i] >= profile[i + 1]) continue;
    const before = Math.max(...profile.slice(i - 6, i));
    const after = Math.max(...profile.slice(i + 1, i + 7));
    const strength = Math.min(before, after) - profile[i];
    if (strength >= 4) valleys.push({ position: i, strength });
  }
  const runs: Run[] = [];
  for (let a = 0; a < valleys.length; a++) {
    for (let b = a + 1; b < valleys.length; b++) {
      const step = valleys[b].position - valleys[a].position;
      if (step > (expectedStep ? expectedStep * 1.035 : 160)) break;
      if (step < (expectedStep ? expectedStep * 0.965 : 14)) continue;
      const tolerance = Math.max(2.8, step * 0.06);
      const points = [valleys[a], valleys[b]];
      for (let n = 2; n < 21; n++) {
        const expected = valleys[a].position + step * n;
        const next = valleys.find((v) => Math.abs(v.position - expected) <= tolerance);
        if (!next) break;
        points.push(next);
      }
      if (points.length < 4) continue;
      const cells = points.length - 1;
      const intervals = points.slice(1).map((point, i) => point.position - points[i].position);
      intervals.sort((a, b) => a - b);
      const pitch = intervals[Math.floor(intervals.length / 2)];
      const end = Math.min(profile.length - 1, points[0].position + pitch * cells);
      runs.push({
        start: points[0].position,
        end,
        cells,
        step: pitch,
        strength: points.reduce((sum, v) => sum + v.strength, 0) / points.length,
      });
    }
  }
  return runs.sort((a, b) => b.cells * b.strength - a.cells * a.strength);
}

/** Detect regular dark gutters. A suggestion is never an authorization to import. */
export function detectGridAreas(frame: PixelFrame): GridDetection[] {
  const { width, height, channels, data } = frame;
  if (width < 64 || height < 64 || width * height > 12_000_000) return [];
  if (data.length < width * height * channels) return [];
  const gray = new Float32Array(width * height);
  const xProfile = Array<number>(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      const value = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
      gray[y * width + x] = value;
      xProfile[x] += value / height;
    }
  }
  // Validate four straight slot frames in two dimensions; menu text alone is insufficient.
  const line = (x: number, y: number, dx: number, dy: number, span: number) => {
    let sum = 0,
      positive = 0;
    for (let n = 0; n < 12; n++) {
      const px = Math.round(x + dx * span * (0.15 + (n * 0.7) / 11));
      const py = Math.round(y + dy * span * (0.15 + (n * 0.7) / 11));
      if (px < 2 || py < 2 || px >= width - 2 || py >= height - 2) return 0;
      const contrast =
        gray[py * width + px] -
        (gray[(py + dx * 2) * width + px + dy * 2] + gray[(py - dx * 2) * width + px - dy * 2]) / 2;
      sum += contrast;
      if (contrast >= 2) positive++;
    }
    return (sum / 12) * (positive / 12) ** 3;
  };
  const scoresCache = new Map<string, number>();
  const slotScore = (x: number, y: number, pitch: number) => {
    const cacheKey = [Math.round(x), Math.round(y), pitch].join(':');
    const cached = scoresCache.get(cacheKey);
    if (cached !== undefined) return cached;
    const sides = [0, 0, 0, 0];
    for (let inset = 0; inset <= 6; inset++) {
      sides[0] = Math.max(sides[0], line(x + inset, y, 0, 1, pitch));
      sides[1] = Math.max(sides[1], line(x + pitch - inset, y, 0, 1, pitch));
      sides[2] = Math.max(sides[2], line(x, y + inset, 1, 0, pitch));
      sides[3] = Math.max(sides[3], line(x, y + pitch - inset, 1, 0, pitch));
    }
    sides.sort((a, b) => a - b);
    const score = sides[0] * 0.6 + sides[1] * 0.4;
    scoresCache.set(cacheKey, score);
    return score;
  };
  const xRuns = gridRuns(xProfile);
  // Small horizontal bands keep a neighboring window from hiding the grid's vertical gutters.
  for (let band = 0; band < 4; band++) {
    const profile = Array<number>(width).fill(0);
    const from = Math.floor((height * band) / 4),
      to = Math.floor((height * (band + 1)) / 4);
    for (let y = from; y < to; y++)
      for (let x = 0; x < width; x++) profile[x] += gray[y * width + x] / (to - from);
    xRuns.push(...gridRuns(profile).slice(0, 50));
  }
  const detections: { grid: GridDetection; score: number }[] = [];
  const seen = new Set<string>();
  for (const xRun of xRuns) {
    const key = [xRun.start, xRun.end, xRun.step].join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    const yProfile = Array<number>(height).fill(0);
    for (let y = 0; y < height; y++)
      for (let x = xRun.start; x < xRun.end; x++)
        yProfile[y] += gray[y * width + x] / (xRun.end - xRun.start);
    for (const yRun of gridRuns(yProfile, xRun.step).slice(0, 16)) {
      if (xRun.cells * yRun.cells > 400) continue;
      const pitch = (xRun.step + yRun.step) / 2;
      let left = xRun.start,
        top = yRun.start,
        columns = xRun.cells,
        rows = yRun.cells;
      const columnQuality = (x: number) =>
        Array.from({ length: rows }, (_, r) => slotScore(x, top + r * pitch, pitch));
      const rowQuality = (y: number) =>
        Array.from({ length: columns }, (_, c) => slotScore(left + c * pitch, y, pitch));
      const complete = (scores: number[]) =>
        scores.filter((v) => v >= 5).length / scores.length >= 0.85;
      while (columns >= 3 && !complete(columnQuality(left))) {
        left += pitch;
        columns--;
      }
      while (columns >= 3 && !complete(columnQuality(left + (columns - 1) * pitch))) columns--;
      while (rows >= 3 && !complete(rowQuality(top))) {
        top += pitch;
        rows--;
      }
      while (rows >= 3 && !complete(rowQuality(top + (rows - 1) * pitch))) rows--;
      if (columns < 3 || rows < 3) continue;
      // A window separator must split neighboring inventories, even when their pitches match.
      let runStart = 0,
        runLength = 0,
        longestStart = 0,
        longestLength = 0;
      for (let c = 0; c <= columns; c++) {
        if (c < columns && complete(columnQuality(left + c * pitch))) {
          if (!runLength) runStart = c;
          runLength++;
        } else {
          if (runLength > longestLength) {
            longestStart = runStart;
            longestLength = runLength;
          }
          runLength = 0;
        }
      }
      if (longestLength < 3) continue;
      left += longestStart * pitch;
      columns = longestLength;
      while (left >= pitch && complete(columnQuality(left - pitch))) {
        left -= pitch;
        columns++;
      }
      while (
        left + (columns + 1) * pitch < width &&
        complete(columnQuality(left + columns * pitch))
      )
        columns++;
      while (top >= pitch && complete(rowQuality(top - pitch))) {
        top -= pitch;
        rows++;
      }
      while (top + (rows + 1) * pitch < height && complete(rowQuality(top + rows * pitch))) rows++;
      if (columns * rows > 400) continue;
      const scores = Array.from({ length: columns * rows }, (_, n) =>
        slotScore(left + (n % columns) * pitch, top + Math.floor(n / columns) * pitch, pitch),
      );
      const coverage = scores.filter((v) => v >= 3).length / scores.length;
      if (coverage < 0.85) continue;
      const score =
        columns *
        rows *
        coverage ** 3 *
        Math.min(20, scores.reduce((a, b) => a + b, 0) / scores.length);
      detections.push({
        score,
        grid: {
          bounds: {
            left: Math.round(left),
            top: Math.round(top),
            width: Math.round(columns * pitch),
            height: Math.round(rows * pitch),
          },
          columns,
          rows,
        },
      });
    }
  }
  const selected: GridDetection[] = [];
  for (const detection of detections.sort((a, b) => b.score - a.score)) {
    const grid = detection.grid;
    if (
      selected.some((other) => {
        const a = other.bounds,
          b = grid.bounds;
        const overlap =
          Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
          Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
        return overlap / Math.min(a.width * a.height, b.width * b.height) > 0.5;
      })
    )
      continue;
    selected.push(grid);
    if (selected.length === 4) break;
  }
  return selected.map((grid) => {
    // In an already cropped grid, outer gutters can fall outside the searchable pixels.
    const extend = (start: number, size: number, cells: number, total: number) => {
      const pitch = size / cells;
      const remainder = total - start - size;
      const nearBoundary = (gap: number) =>
        gap >= 0 && gap <= pitch * 1.15 && Math.abs(gap / pitch - Math.round(gap / pitch)) <= 0.12;
      const wholeCells = Math.round(total / pitch);
      if (
        nearBoundary(start) &&
        nearBoundary(remainder) &&
        Math.abs(total / pitch - wholeCells) <= 0.12
      ) {
        return { start: 0, size: total, cells: wholeCells };
      }
      return { start, size, cells };
    };
    const x = extend(grid.bounds.left, grid.bounds.width, grid.columns, width);
    const y = extend(grid.bounds.top, grid.bounds.height, grid.rows, height);
    if (x.cells * y.cells > 400) return grid;
    return {
      bounds: { left: x.start, top: y.start, width: x.size, height: y.size },
      columns: x.cells,
      rows: y.cells,
    };
  });
}

export function detectGridPixels(frame: PixelFrame): GridDetection | null {
  return detectGridAreas(frame)[0] ?? null;
}

export function detectStorageGrids(image: CanvasImageSource, width: number, height: number) {
  const scale = storageGridAnalysisScale(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const grids = detectGridAreas({
    data: context.getImageData(0, 0, canvas.width, canvas.height).data,
    width: canvas.width,
    height: canvas.height,
    channels: 4,
  });
  return grids.map((grid) => ({
    ...grid,
    bounds: {
      left: Math.round(grid.bounds.left / scale),
      top: Math.round(grid.bounds.top / scale),
      width: Math.round(grid.bounds.width / scale),
      height: Math.round(grid.bounds.height / scale),
    },
  }));
}
