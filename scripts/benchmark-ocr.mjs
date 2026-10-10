#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const typescript = requireWeb('typescript');
const defaultSharp = requireApi('sharp');
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDatasetRoot = path.resolve(scriptDirectory, '../tmp/ocr-dataset');
const gridIouThreshold = 0.5;

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
}

function metrics(counts) {
  const precision = ratio(counts.truePositive, counts.truePositive + counts.falsePositive);
  const recall = ratio(counts.truePositive, counts.truePositive + counts.falseNegative);
  return {
    truePositive: counts.truePositive,
    falsePositive: counts.falsePositive,
    falseNegative: counts.falseNegative,
    precision,
    recall,
    f1: precision + recall > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0,
  };
}

function quantityMetrics(counts) {
  return {
    total: counts.total,
    exact: counts.exact,
    accuracy: ratio(counts.exact, counts.total),
    common: { total: counts.common.total, exact: counts.common.exact, accuracy: ratio(counts.common.exact, counts.common.total) },
    abbreviated: {
      total: counts.abbreviated.total,
      exact: counts.abbreviated.exact,
      accuracy: ratio(counts.abbreviated.exact, counts.abbreviated.total),
    },
  };
}

function romanMetrics(counts) {
  return { total: counts.total, exact: counts.exact, accuracy: ratio(counts.exact, counts.total) };
}

function emptyVariant(row) {
  return {
    split: row.split,
    width: row.width,
    height: row.height,
    uiScale: row.uiScale,
    columns: row.columns,
    panelType: row.panelType,
    grid: { truePositive: 0, falsePositive: 0, falseNegative: 0 },
    quantities: { total: 0, exact: 0, common: { total: 0, exact: 0 }, abbreviated: { total: 0, exact: 0 } },
    roman: { total: 0, exact: 0 },
    spuriousLabels: 0,
  };
}

function finishVariant(variant) {
  return {
    split: variant.split,
    width: variant.width,
    height: variant.height,
    uiScale: variant.uiScale,
    columns: variant.columns,
    panelType: variant.panelType,
    grid: metrics(variant.grid),
    quantities: quantityMetrics(variant.quantities),
    roman: romanMetrics(variant.roman),
    spuriousLabels: variant.spuriousLabels,
  };
}

function intersectionOverUnion(first, second) {
  const left = Math.max(first.left, second.left);
  const top = Math.max(first.top, second.top);
  const right = Math.min(first.left + first.width, second.left + second.width);
  const bottom = Math.min(first.top + first.height, second.top + second.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = first.width * first.height + second.width * second.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function maximumAssignment(cost) {
  const size = cost.length;
  const u = Array(size + 1).fill(0);
  const v = Array(size + 1).fill(0);
  const p = Array(size + 1).fill(0);
  const way = Array(size + 1).fill(0);
  for (let row = 1; row <= size; row++) {
    p[0] = row;
    let column0 = 0;
    const minimum = Array(size + 1).fill(Number.POSITIVE_INFINITY);
    const used = Array(size + 1).fill(false);
    do {
      used[column0] = true;
      const row0 = p[column0];
      let delta = Number.POSITIVE_INFINITY;
      let column1 = 0;
      for (let column = 1; column <= size; column++) {
        if (used[column]) continue;
        const current = cost[row0 - 1][column - 1] - u[row0] - v[column];
        if (current < minimum[column]) {
          minimum[column] = current;
          way[column] = column0;
        }
        if (minimum[column] < delta) {
          delta = minimum[column];
          column1 = column;
        }
      }
      for (let column = 0; column <= size; column++) {
        if (used[column]) {
          u[p[column]] += delta;
          v[column] -= delta;
        } else minimum[column] -= delta;
      }
      column0 = column1;
    } while (p[column0] !== 0);
    do {
      const column1 = way[column0];
      p[column0] = p[column1];
      column0 = column1;
    } while (column0 !== 0);
  }
  const assignment = Array(size).fill(-1);
  for (let column = 1; column <= size; column++) if (p[column] > 0) assignment[p[column] - 1] = column - 1;
  return assignment;
}

export function matchGridSlots(expectedSlots, detectedSlots, threshold = gridIouThreshold) {
  if (!Array.isArray(expectedSlots) || !Array.isArray(detectedSlots)) throw new Error('Grid slots must be arrays.');
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('IoU threshold must be between 0 and 1.');
  for (const slot of [...expectedSlots, ...detectedSlots]) {
    if (
      !slot ||
      !Number.isFinite(slot.left) ||
      !Number.isFinite(slot.top) ||
      !Number.isFinite(slot.width) ||
      !Number.isFinite(slot.height) ||
      slot.width <= 0 ||
      slot.height <= 0
    )
      throw new Error('Every grid slot must have finite positive bounds.');
  }
  const size = Math.max(expectedSlots.length, detectedSlots.length);
  if (size === 0) return { truePositive: 0, falsePositive: 0, falseNegative: 0, matches: [] };
  const ious = expectedSlots.map((expected) => detectedSlots.map((detected) => intersectionOverUnion(expected, detected)));
  const cost = Array.from({ length: size }, (_, expectedIndex) =>
    Array.from({ length: size }, (_, detectedIndex) => {
      const iou = ious[expectedIndex]?.[detectedIndex] ?? 0;
      return iou >= threshold ? 1 - iou : 1_000_000;
    }),
  );
  const assignment = maximumAssignment(cost);
  const matches = [];
  for (let expectedIndex = 0; expectedIndex < expectedSlots.length; expectedIndex++) {
    const detectedIndex = assignment[expectedIndex];
    if (detectedIndex < 0 || detectedIndex >= detectedSlots.length) continue;
    const iou = ious[expectedIndex][detectedIndex];
    if (iou >= threshold) matches.push({ expectedIndex, detectedIndex, iou: Number(iou.toFixed(6)) });
  }
  const truePositive = matches.length;
  return {
    truePositive,
    falsePositive: detectedSlots.length - truePositive,
    falseNegative: expectedSlots.length - truePositive,
    matches,
  };
}

function variantKey(row) {
  return [row.split, row.width, row.height, row.uiScale, row.columns, row.panelType].join('|');
}

function uniqueMetricCounts(manifest, realManifest) {
  const syntheticHashes = new Set((manifest.samples ?? []).map((sample) => sample.sha256).filter(Boolean));
  const realCaptures = realManifest?.captures ?? [];
  const realHashes = new Set(realCaptures.map((capture) => capture.sha256).filter(Boolean));
  const reviewedHashes = new Set(
    realCaptures.filter((capture) => ['reviewed', 'verified'].includes(capture.labelStatus)).map((capture) => capture.sha256),
  );
  const trainingHashes = new Set(
    realCaptures.filter((capture) => capture.trainingPermissionGranted || capture.use === 'training').map((capture) => capture.sha256),
  );
  return {
    targetComposition: { synthetic: 0.8, real: 0.2 },
    syntheticUniqueImages: syntheticHashes.size,
    realUniqueImages: realHashes.size,
    realWithReviewedLabels: [...reviewedHashes].filter((hash) => realHashes.has(hash)).length,
    realWithTrainingPermission: [...trainingHashes].filter((hash) => realHashes.has(hash)).length,
  };
}

export function summarizeOcrRows(rows) {
  if (!Array.isArray(rows)) throw new Error('OCR benchmark rows must be an array.');
  const gridCounts = { truePositive: 0, falsePositive: 0, falseNegative: 0 };
  const quantities = { total: 0, exact: 0, common: { total: 0, exact: 0 }, abbreviated: { total: 0, exact: 0 } };
  const roman = { total: 0, exact: 0 };
  let spuriousLabels = 0;
  const groups = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const key = variantKey(row);
    let group = groups.get(key);
    if (!group) {
      group = emptyVariant(row);
      groups.set(key, group);
    }
    if (row.rowType === 'grid') {
      const grid = row.grid ?? {};
      for (const count of ['truePositive', 'falsePositive', 'falseNegative']) {
        const value = safeCount(grid[count]);
        gridCounts[count] += value;
        group.grid[count] += value;
      }
      continue;
    }
    if (row.rowType !== 'label') continue;
    if (row.labelKind === 'spurious' || row.status === 'spurious') {
      spuriousLabels++;
      group.spuriousLabels++;
      continue;
    }
    if (row.labelKind === 'quantity') {
      const bucket = row.approximate ? 'abbreviated' : 'common';
      quantities.total++;
      group.quantities.total++;
      quantities[bucket].total++;
      group.quantities[bucket].total++;
      if (row.status === 'exact') {
        quantities.exact++;
        group.quantities.exact++;
        quantities[bucket].exact++;
        group.quantities[bucket].exact++;
      }
    } else if (row.labelKind === 'enhancement') {
      roman.total++;
      group.roman.total++;
      if (row.status === 'exact') {
        roman.exact++;
        group.roman.exact++;
      }
    }
  }
  return {
    grid: metrics(gridCounts),
    quantities: quantityMetrics(quantities),
    roman: romanMetrics(roman),
    spuriousLabels,
    byVariant: [...groups.values()].map(finishVariant).sort((left, right) => variantKey(left).localeCompare(variantKey(right))),
  };
}

function withinDirectory(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function validateRect(value, width, height, label) {
  if (
    !value ||
    !Number.isFinite(value.left) ||
    !Number.isFinite(value.top) ||
    !Number.isFinite(value.width) ||
    !Number.isFinite(value.height) ||
    value.left < 0 ||
    value.top < 0 ||
    value.width <= 0 ||
    value.height <= 0 ||
    value.left + value.width > width ||
    value.top + value.height > height
  )
    throw new Error(`Synthetic manifest contains invalid ${label} bounds.`);
}

export async function validateSyntheticManifest(manifestPath, { split = 'evaluation', sharp = defaultSharp } = {}) {
  if (!['evaluation', 'calibration'].includes(split)) throw new Error('Split must be evaluation or calibration.');
  const absoluteManifest = path.resolve(manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(absoluteManifest, 'utf8'));
  } catch {
    throw new Error('Could not read the synthetic ground-truth manifest.');
  }
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.samples) || manifest.samples.length === 0)
    throw new Error('Synthetic manifest must use schemaVersion 1 and contain samples.');
  if (manifest.split && manifest.split !== split) throw new Error(`Manifest split is ${manifest.split}; requested ${split}.`);
  const root = path.dirname(absoluteManifest);
  const samples = [];
  for (const sample of manifest.samples) {
    if (!sample || sample.split !== split) throw new Error(`Synthetic sample split must be ${split}.`);
    if (typeof sample.path !== 'string' || path.isAbsolute(sample.path) || path.win32.isAbsolute(sample.path))
      throw new Error('Synthetic manifest image path must be relative.');
    const imagePath = path.resolve(root, sample.path);
    if (!withinDirectory(root, imagePath)) throw new Error('Synthetic manifest image path escapes the manifest directory.');
    if (!/^[a-f0-9]{64}$/.test(sample.sha256)) throw new Error('Synthetic image SHA-256 must be a lowercase 64-character hash.');
    const image = await readFile(imagePath).catch(() => {
      throw new Error('Synthetic manifest image is missing.');
    });
    const actualHash = createHash('sha256').update(image).digest('hex');
    if (actualHash !== sample.sha256) throw new Error('Synthetic image SHA-256 does not match its manifest.');
    let metadata;
    try {
      metadata = await sharp(image, { failOn: 'error' }).metadata();
    } catch {
      throw new Error('Synthetic image could not be decoded.');
    }
    if (metadata.format !== 'jpeg' || metadata.width !== sample.width || metadata.height !== sample.height)
      throw new Error('Synthetic image format or dimensions do not match its manifest metadata.');
    if (!Number.isSafeInteger(sample.width) || !Number.isSafeInteger(sample.height) || sample.width <= 0 || sample.height <= 0)
      throw new Error('Synthetic image dimensions are invalid.');
    if (!Array.isArray(sample.slots) || !sample.grid || !Number.isSafeInteger(sample.grid.columns) || !Number.isSafeInteger(sample.grid.rows))
      throw new Error('Synthetic sample has no valid grid and slot metadata.');
    for (const slot of sample.slots) {
      validateRect(slot.bounds, sample.width, sample.height, 'slot');
      if (slot.labelBounds) validateRect(slot.labelBounds, sample.width, sample.height, 'label');
    }
    samples.push({ sample, imagePath, image });
  }
  return { manifest, manifestPath: absoluteManifest, samples };
}

export function buildBenchmarkReport({ manifest, rows, realManifest, evaluatedAt = new Date() }) {
  const summary = summarizeOcrRows(rows);
  return {
    schemaVersion: 1,
    evaluatedAt: evaluatedAt instanceof Date ? evaluatedAt.toISOString() : new Date(evaluatedAt).toISOString(),
    split: manifest.split ?? manifest.samples?.[0]?.split ?? 'unknown',
    parserVersions: {
      grid: 'storage-grid.ts',
      quantity: 'visible-quantity.ts',
      enhancement: 'equipment-reading.ts',
    },
    configuration: { gridIouThreshold, textMinimumConfidence: 0 },
    metrics: summary,
    availableCorpus: uniqueMetricCounts(manifest, realManifest),
  };
}

async function importTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(scriptDirectory, relativePath);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

export async function loadOcrReaders() {
  const [grid, quantity, enhancement] = await Promise.all([
    importTypeScriptModule('../apps/web/src/app/features/scans/storage-grid.ts'),
    importTypeScriptModule('../apps/web/src/app/features/scans/visible-quantity.ts'),
    importTypeScriptModule('../apps/web/src/app/features/scans/equipment-reading.ts'),
  ]);
  return {
    detectGridAreas: grid.detectGridAreas,
    parseVisibleQuantity: quantity.parseVisibleQuantity,
    parseEnhancement: enhancement.parseEnhancement,
  };
}

export function mapOcrLines(data, scaleX = 1, scaleY = 1) {
  return (
    data?.blocks?.flatMap((block) =>
      block.paragraphs?.flatMap((paragraph) =>
        paragraph.lines?.flatMap((line) => {
          const text = typeof line.text === 'string' ? line.text.trim() : '';
          const { x0, y0, x1, y1 } = line.bbox ?? {};
          if (!text || ![x0, y0, x1, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return [];
          return [{
            text,
            confidence: Number.isFinite(line.confidence) ? Math.max(0, Math.min(100, line.confidence)) : 0,
            bounds: { left: x0 / scaleX, top: y0 / scaleY, width: (x1 - x0) / scaleX, height: (y1 - y0) / scaleY },
          }];
        }) ?? [],
      ) ?? [],
    ) ?? []
  );
}

function rectangleIntersectionOverMinimum(first, second) {
  const intersectionWidth = Math.max(0, Math.min(first.left + first.width, second.left + second.width) - Math.max(first.left, second.left));
  const intersectionHeight = Math.max(0, Math.min(first.top + first.height, second.top + second.height) - Math.max(first.top, second.top));
  const intersection = intersectionWidth * intersectionHeight;
  const minimum = Math.min(first.width * first.height, second.width * second.height);
  return minimum > 0 ? intersection / minimum : 0;
}

function centerIn(bounds, outer) {
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  return centerX >= outer.left && centerX <= outer.left + outer.width && centerY >= outer.top && centerY <= outer.top + outer.height;
}

function detectedSlotBounds(detections, scaleX, scaleY) {
  const output = [];
  for (const detection of detections) {
    const { bounds, columns, rows } = detection;
    if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) || columns < 1 || rows < 1) continue;
    const slotWidth = bounds.width / columns;
    const slotHeight = bounds.height / rows;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        output.push({
          left: (bounds.left + column * slotWidth) * scaleX,
          top: (bounds.top + row * slotHeight) * scaleY,
          width: slotWidth * scaleX,
          height: slotHeight * scaleY,
        });
      }
    }
  }
  return output;
}

function classifyLabel(slot, text, readers) {
  if (slot.labelKind === 'quantity') {
    const parsed = readers.parseVisibleQuantity(text);
    if (!parsed) return { status: 'incorrect' };
    const actualValue = Number(parsed.value);
    const exact = actualValue === Number(slot.normalizedValue) && parsed.approximate === Boolean(slot.approximate);
    return { status: exact ? 'exact' : 'incorrect', actualValue, actualApproximate: parsed.approximate };
  }
  if (slot.labelKind === 'enhancement') {
    const parsed = readers.parseEnhancement(text);
    if (!parsed || parsed.rank === null) return { status: 'incorrect' };
    const actualValue = parsed.rank;
    return { status: actualValue === Number(slot.normalizedValue) ? 'exact' : 'incorrect', actualValue };
  }
  return { status: 'incorrect' };
}

function baseSampleRow(sample) {
  return {
    sampleId: sample.id,
    split: sample.split,
    width: sample.width,
    height: sample.height,
    uiScale: sample.uiScale,
    columns: sample.grid.columns,
    panelType: sample.panelType,
  };
}

export async function recognizeSample({ imagePath, sample, readers, worker, sharp = defaultSharp }) {
  const image = await readFile(imagePath);
  const detectorMaxDimension = 1600;
  const detectorScale = Math.min(1, detectorMaxDimension / Math.max(sample.width, sample.height));
  const detectorWidth = Math.max(1, Math.round(sample.width * detectorScale));
  const detectorHeight = Math.max(1, Math.round(sample.height * detectorScale));
  const detectorPipeline = sharp(image).resize(detectorWidth, detectorHeight, { fit: 'fill' }).toColourspace('srgb').removeAlpha().raw();
  const { data: pixels, info } = await detectorPipeline.toBuffer({ resolveWithObject: true });
  const gridDetections = readers.detectGridAreas({ data: pixels, width: info.width, height: info.height, channels: info.channels });
  const expectedBounds = sample.slots.map((slot) => slot.bounds);
  const detectedBounds = detectedSlotBounds(gridDetections, sample.width / info.width, sample.height / info.height);
  const gridMatches = matchGridSlots(expectedBounds, detectedBounds, gridIouThreshold);
  const base = baseSampleRow(sample);
  const rows = [{ rowType: 'grid', ...base, grid: gridMatches }];

  const ocrMaxDimension = 2400;
  const ocrScale = Math.min(1, ocrMaxDimension / Math.max(sample.width, sample.height));
  const ocrImage = ocrScale < 1
    ? await sharp(image).resize(Math.round(sample.width * ocrScale), Math.round(sample.height * ocrScale), { fit: 'fill' }).png().toBuffer()
    : image;
  const { data: ocrData } = await worker.recognize(ocrImage, {}, { text: true, blocks: true });
  const lines = mapOcrLines(ocrData, sample.width / (ocrScale < 1 ? Math.round(sample.width * ocrScale) : sample.width), sample.height / (ocrScale < 1 ? Math.round(sample.height * ocrScale) : sample.height));
  const usedLines = new Set();
  const labeledSlots = sample.slots.filter((slot) => slot.labelKind === 'quantity' || slot.labelKind === 'enhancement');

  for (const slot of labeledSlots) {
    const bounds = slot.labelBounds ?? slot.bounds;
    const candidates = lines
      .map((line, index) => ({ line, index, overlap: rectangleIntersectionOverMinimum(line.bounds, bounds) }))
      .filter(({ line, overlap }) => !usedLines.has(line) && (overlap >= 0.08 || centerIn(line.bounds, bounds)))
      .sort((left, right) => right.overlap - left.overlap || right.line.confidence - left.line.confidence);
    const candidate = candidates[0];
    if (!candidate) {
      rows.push({ rowType: 'label', ...base, labelKind: slot.labelKind, status: 'unread', approximate: Boolean(slot.approximate) });
      continue;
    }
    usedLines.add(candidate.line);
    const classified = classifyLabel(slot, candidate.line.text, readers);
    rows.push({
      rowType: 'label',
      ...base,
      labelKind: slot.labelKind,
      status: classified.status,
      approximate: Boolean(slot.approximate),
      expectedValue: slot.normalizedValue,
      actualValue: classified.actualValue,
      actualApproximate: classified.actualApproximate,
      confidence: candidate.line.confidence,
    });
  }

  const emptySlots = sample.slots.filter((slot) => slot.labelKind !== 'quantity' && slot.labelKind !== 'enhancement');
  for (const line of lines) {
    if (usedLines.has(line)) continue;
    const slot = emptySlots.find((candidate) => centerIn(line.bounds, candidate.bounds));
    if (!slot) continue;
    const quantity = readers.parseVisibleQuantity(line.text);
    const enhancement = readers.parseEnhancement(line.text);
    if (!quantity && !enhancement) continue;
    usedLines.add(line);
    rows.push({ rowType: 'label', ...base, labelKind: 'spurious', status: 'spurious', approximate: Boolean(quantity?.approximate) });
  }
  return rows;
}

function validBenchmarkOutputPath(outputPath) {
  const absolute = path.resolve(outputPath);
  const parent = path.dirname(absolute);
  return path.basename(parent).toLowerCase() === 'ocr-dataset' && path.basename(path.dirname(parent)).toLowerCase() === 'tmp';
}

async function readRealCompositionManifest(manifestPath) {
  if (!manifestPath) return undefined;
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    throw new Error('Could not read the real-capture manifest.');
  }
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.captures))
    throw new Error('Real-capture manifest must use schemaVersion 1 and contain captures.');
  return manifest;
}

async function createLocalOcrWorker() {
  const { createWorker, PSM } = requireWeb('tesseract.js');
  const worker = await createWorker('por', 1);
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1' });
  return worker;
}

export async function runBenchmark({
  manifestPath,
  outputPath,
  split = 'evaluation',
  realManifestPath,
  workerFactory = createLocalOcrWorker,
  sharp = defaultSharp,
  evaluatedAt = new Date(),
}) {
  if (!outputPath || !validBenchmarkOutputPath(outputPath)) throw new Error('Benchmark report output must be inside tmp/ocr-dataset/.');
  const validated = await validateSyntheticManifest(manifestPath, { split, sharp });
  const realManifest = await readRealCompositionManifest(realManifestPath);
  const readers = await loadOcrReaders();
  let worker;
  try {
    worker = await workerFactory();
  } catch {
    throw new Error('Local Portuguese OCR worker could not be initialized. Confirm Tesseract.js and its language data are available.');
  }
  const rows = [];
  try {
    for (const { sample, imagePath } of validated.samples) {
      rows.push(...await recognizeSample({ imagePath, sample, readers, worker, sharp }));
    }
  } finally {
    await worker?.terminate?.();
  }
  const report = buildBenchmarkReport({ manifest: validated.manifest, rows, realManifest, evaluatedAt });
  const absoluteOutput = path.resolve(outputPath);
  await mkdir(path.dirname(absoluteOutput), { recursive: true });
  const temporaryPath = `${absoluteOutput}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
  await rename(temporaryPath, absoluteOutput);
  return { report, outputPath: absoluteOutput };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCli().catch((error) => {
    process.stderr.write(`OCR benchmark failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
