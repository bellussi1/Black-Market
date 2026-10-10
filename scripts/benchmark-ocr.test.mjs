import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import {
  buildBenchmarkReport,
  loadOcrReaders,
  mapOcrLines,
  matchGridSlots,
  parseBenchmarkArgs,
  recognizeSample,
  runBenchmark,
  runBenchmarkCli,
  summarizeOcrRows,
  validateSyntheticManifest,
} from './benchmark-ocr.mjs';

const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = requireApi('sharp');
const temporaryDirectories = [];

function box(left, top, width, height) {
  return { left, top, width, height };
}

function row(overrides = {}) {
  return {
    rowType: 'label',
    sampleId: 'sample-1',
    split: 'evaluation',
    width: 1920,
    height: 1080,
    uiScale: 1,
    columns: 8,
    panelType: 'storage',
    labelKind: 'quantity',
    status: 'exact',
    approximate: false,
    ...overrides,
  };
}

async function makeManifest({ split = 'evaluation', imageSize = [640, 480], expectedSize = imageSize, pathName = 'images/sample-1.jpg', hash } = {}) {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bdo-ocr-benchmark-'));
  temporaryDirectories.push(parent);
  const datasetRoot = path.join(parent, 'tmp', 'ocr-dataset', 'synthetic');
  const images = path.join(datasetRoot, 'images');
  await mkdir(images, { recursive: true });
  const imagePath = path.resolve(datasetRoot, pathName);
  const image = await sharp({
    create: { width: imageSize[0], height: imageSize[1], channels: 3, background: '#161616' },
  }).jpeg().toBuffer();
  if (imagePath.startsWith(`${datasetRoot}${path.sep}`)) await writeFile(imagePath, image);
  const grid = { left: 20, top: 20, columns: 8, rows: 6, slotWidth: 24, slotHeight: 24 };
  const slots = Array.from({ length: grid.columns * grid.rows }, (_, index) => {
    const row = Math.floor(index / grid.columns);
    const column = index % grid.columns;
    return {
      row,
      column,
      bounds: box(grid.left + column * grid.slotWidth, grid.top + row * grid.slotHeight, grid.slotWidth, grid.slotHeight),
    };
  });
  const sample = {
    id: 'sample-1',
    path: pathName,
    sha256: hash ?? createHash('sha256').update(image).digest('hex'),
    width: expectedSize[0],
    height: expectedSize[1],
    seed: 100,
    split,
    uiScale: 1,
    noiseLevel: 0,
    jpegQuality: 85,
    panelType: 'storage',
    grid,
    slots,
  };
  const manifestPath = path.join(datasetRoot, 'ground-truth.json');
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, generator: 'bdo-ocr-synthetic', split, samples: [sample] }));
  return manifestPath;
}

async function makeBenchmarkOutput() {
  const parent = temporaryDirectories.at(-1);
  const directory = path.join(parent, 'tmp', 'ocr-dataset');
  await mkdir(directory, { recursive: true });
  return path.join(directory, 'benchmark.json');
}

async function makeRecognitionFixture({ labelKind = 'quantity', displayedText = '319.9k', normalizedValue = 319900, approximate = true } = {}) {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bdo-ocr-recognition-'));
  temporaryDirectories.push(parent);
  const imagePath = path.join(parent, 'sample.jpg');
  await sharp({
    create: { width: 640, height: 480, channels: 3, background: '#161616' },
  }).jpeg().toFile(imagePath);
  const bounds = box(100, 100, 80, 60);
  const sample = {
    id: 'sample-00001',
    split: 'evaluation',
    width: 640,
    height: 480,
    uiScale: 1,
    panelType: 'inventory',
    grid: { left: 100, top: 100, columns: 1, rows: 1, slotWidth: 80, slotHeight: 60 },
    slots: [{
      row: 0,
      column: 0,
      bounds,
      labelBounds: box(140, 145, 36, 12),
      itemId: '100',
      labelKind,
      displayedText,
      normalizedValue,
      approximate,
    }],
  };
  const worker = {
    recognize: async () => ({ data: { blocks: [{ paragraphs: [{ lines: [{
      text: displayedText,
      confidence: 95,
      bbox: { x0: 140, y0: 145, x1: 176, y1: 157 },
    }] }] }] } }),
  };
  return { imagePath, sample, worker };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test('matchesSlotsOnlyAtOrAboveHalfIou', () => {
  const result = matchGridSlots([box(0, 0, 3, 3)], [box(1, 0, 3, 3)]);
  const belowThreshold = matchGridSlots([box(0, 0, 3, 3)], [box(2, 0, 3, 3)]);

  assert.equal(result.truePositive, 1);
  assert.equal(result.matches[0].iou, 0.5);
  assert.equal(belowThreshold.truePositive, 0);
  assert.equal(belowThreshold.falseNegative, 1);
  assert.equal(belowThreshold.falsePositive, 1);
});

test('assignsEachDetectedSlotAtMostOnce', () => {
  const result = matchGridSlots([box(0, 0, 100, 100)], [box(0, 0, 100, 100), box(1, 0, 100, 100)]);

  assert.equal(result.truePositive, 1);
  assert.equal(result.falseNegative, 0);
  assert.equal(result.falsePositive, 1);
  assert.equal(result.matches.length, 1);
});

test('countsEmptySlotsAndGridFalsePositives', () => {
  const summary = summarizeOcrRows([
    { rowType: 'grid', sampleId: 's1', split: 'evaluation', width: 1920, height: 1080, uiScale: 1, columns: 8, panelType: 'storage', grid: { truePositive: 5, falsePositive: 2, falseNegative: 3 } },
    row({ sampleId: 's1' }),
    row({ sampleId: 's1', labelKind: null, status: 'empty' }),
  ]);

  assert.deepEqual(summary.grid, { truePositive: 5, falsePositive: 2, falseNegative: 3, precision: 0.7143, recall: 0.625, f1: 0.6667 });
  assert.equal(summary.quantities.total, 1);
  assert.equal(summary.quantities.exact, 1);
});

test('countsUnreadQuantityAndRomanAsErrors', () => {
  const summary = summarizeOcrRows([
    row({ sampleId: 's1', status: 'unread', labelKind: 'quantity', approximate: false }),
    row({ sampleId: 's2', status: 'unread', labelKind: 'enhancement' }),
  ]);

  assert.equal(summary.quantities.total, 1);
  assert.equal(summary.quantities.exact, 0);
  assert.equal(summary.quantities.accuracy, 0);
  assert.equal(summary.roman.total, 1);
  assert.equal(summary.roman.exact, 0);
  assert.equal(summary.roman.accuracy, 0);
});

test('countsSpuriousLabelsOnEmptySlots', () => {
  const summary = summarizeOcrRows([
    row({ sampleId: 's1', labelKind: 'spurious', status: 'spurious', approximate: false }),
    row({ sampleId: 's1', labelKind: null, status: 'empty' }),
  ]);

  assert.equal(summary.spuriousLabels, 1);
  assert.equal(summary.quantities.total, 0);
  assert.equal(summary.roman.total, 0);
});

test('parsesAbbreviatedValuesWithApproximation', () => {
  const summary = summarizeOcrRows([
    row({ labelKind: 'quantity', approximate: true, status: 'exact', expectedValue: 139100, actualValue: 139100 }),
    row({ sampleId: 's2', labelKind: 'quantity', approximate: true, status: 'exact', expectedValue: 319900, actualValue: 319900 }),
    row({ sampleId: 's3', labelKind: 'quantity', approximate: true, status: 'exact', expectedValue: 1300000, actualValue: 1300000 }),
  ]);

  assert.equal(summary.quantities.abbreviated.total, 3);
  assert.equal(summary.quantities.abbreviated.exact, 3);
  assert.equal(summary.quantities.abbreviated.accuracy, 1);
});

test('separatesCalibrationFromEvaluation', async () => {
  const manifestPath = await makeManifest({ split: 'calibration' });

  await assert.rejects(validateSyntheticManifest(manifestPath), /evaluation|calibration/i);
  const calibration = await validateSyntheticManifest(manifestPath, { split: 'calibration' });
  assert.equal(calibration.manifest.split, 'calibration');
  assert.equal(calibration.samples.length, 1);
});

test('reportsAvailableRealSyntheticCompositionByUniqueHash', () => {
  const report = buildBenchmarkReport({
    manifest: { schemaVersion: 1, split: 'evaluation', samples: [{ sha256: 'synthetic-a' }, { sha256: 'synthetic-a' }, { sha256: 'synthetic-b' }] },
    rows: [],
    realManifest: { schemaVersion: 1, captures: [
      { sha256: 'real-a', use: 'validation', labelStatus: 'unlabeled' },
      { sha256: 'real-a', use: 'training', labelStatus: 'reviewed' },
      { sha256: 'real-b', use: 'training', labelStatus: 'unlabeled' },
    ] },
  });

  assert.deepEqual(report.availableCorpus, {
    targetComposition: { synthetic: 0.8, real: 0.2 },
    syntheticUniqueImages: 2,
    realUniqueImages: 2,
    realWithReviewedLabels: 1,
    realWithTrainingPermission: 2,
  });
  assert.equal(JSON.stringify(report).includes('sourceUrl'), false);
  assert.equal(JSON.stringify(report).includes('real-a'), false);
});

test('rejectsManifestPathTraversalHashMismatchAndMetadataMismatch', async () => {
  const traversalPath = await makeManifest({ pathName: '../outside.jpg' });
  await assert.rejects(validateSyntheticManifest(traversalPath), /path|contain/i);
  const hashPath = await makeManifest({ hash: '0'.repeat(64) });
  await assert.rejects(validateSyntheticManifest(hashPath), /hash|sha/i);
  const dimensionPath = await makeManifest({ expectedSize: [641, 480] });
  await assert.rejects(validateSyntheticManifest(dimensionPath), /dimension|metadata/i);
});

test('decodesRgbForCurrentGridDetector', async () => {
  const fixture = await makeRecognitionFixture();
  const readers = await loadOcrReaders();
  let receivedFrame;
  readers.detectGridAreas = (frame) => {
    receivedFrame = frame;
    return [{ bounds: box(100, 100, 80, 60), columns: 1, rows: 1 }];
  };

  const rows = await recognizeSample({ ...fixture, readers, sharp });

  assert.equal(receivedFrame.channels, 3);
  assert.equal(receivedFrame.data.length, receivedFrame.width * receivedFrame.height * 3);
  assert.equal(rows.find(({ rowType }) => rowType === 'grid').grid.truePositive, 1);
});

test('mapsOcrBoxesBackToOriginalCoordinates', () => {
  const lines = mapOcrLines({
    blocks: [{ paragraphs: [{ lines: [{ text: 'I.3k', confidence: 88, bbox: { x0: 20, y0: 40, x1: 60, y1: 64 } }] }] }],
  }, 2, 2);

  assert.deepEqual(lines[0].bounds, box(10, 20, 20, 12));
});

test('assignsQuantityTextToTheCorrectSlot', async () => {
  const fixture = await makeRecognitionFixture();
  const readers = await loadOcrReaders();
  readers.detectGridAreas = () => [{ bounds: box(100, 100, 80, 60), columns: 1, rows: 1 }];

  const rows = await recognizeSample({ ...fixture, readers, sharp });
  const label = rows.find(({ rowType }) => rowType === 'label');

  assert.equal(label.status, 'exact');
  assert.equal(label.labelKind, 'quantity');
  assert.equal(label.approximate, true);
  assert.equal(label.actualValue, 319900);
});

test('assignsRomanTextToTheCorrectSlot', async () => {
  const fixture = await makeRecognitionFixture({ labelKind: 'enhancement', displayedText: 'VIII', normalizedValue: 8, approximate: false });
  const readers = await loadOcrReaders();
  readers.detectGridAreas = () => [{ bounds: box(100, 100, 80, 60), columns: 1, rows: 1 }];

  const rows = await recognizeSample({ ...fixture, readers, sharp });

  assert.equal(rows.find(({ rowType }) => rowType === 'label').status, 'exact');
  assert.equal(summarizeOcrRows(rows).roman.accuracy, 1);
});

test('countsMissingLabelAsUnread', async () => {
  const fixture = await makeRecognitionFixture();
  fixture.worker.recognize = async () => ({ data: { blocks: [] } });
  const readers = await loadOcrReaders();
  readers.detectGridAreas = () => [{ bounds: box(100, 100, 80, 60), columns: 1, rows: 1 }];

  const rows = await recognizeSample({ ...fixture, readers, sharp });

  assert.equal(rows.find(({ rowType }) => rowType === 'label').status, 'unread');
  assert.equal(summarizeOcrRows(rows).quantities.accuracy, 0);
});

test('rejectsCalibrationManifestByDefaultBeforeStartingOcr', async () => {
  const manifestPath = await makeManifest({ split: 'calibration' });
  let workerStarted = false;

  await assert.rejects(runBenchmark({
    manifestPath,
    outputPath: await makeBenchmarkOutput(),
    workerFactory: async () => {
      workerStarted = true;
      throw new Error('Worker must not start.');
    },
  }), /evaluation|calibration/i);
  assert.equal(workerStarted, false);
});

test('parsesBenchmarkManifestAndOutputOptions', () => {
  const options = parseBenchmarkArgs([
    '--manifest', 'tmp/ocr-dataset/synthetic-evaluation/ground-truth.json',
    '--output', 'tmp/ocr-dataset/benchmark.json',
    '--real-manifest', 'tmp/ocr-dataset/real/manifest.json',
  ]);

  assert.equal(options.manifestPath, path.resolve('tmp/ocr-dataset/synthetic-evaluation/ground-truth.json'));
  assert.equal(options.outputPath, path.resolve('tmp/ocr-dataset/benchmark.json'));
  assert.equal(options.split, 'evaluation');
  assert.equal(options.realManifestPath, path.resolve('tmp/ocr-dataset/real/manifest.json'));
});

test('acceptsCalibrationOnlyWhenExplicit', () => {
  const options = parseBenchmarkArgs([
    '--manifest', 'tmp/ocr-dataset/synthetic/ground-truth.json',
    '--output', 'tmp/ocr-dataset/calibration-report.json',
    '--split', 'calibration',
  ]);

  assert.equal(options.split, 'calibration');
  assert.throws(() => parseBenchmarkArgs([
    '--manifest', 'tmp/ocr-dataset/synthetic/ground-truth.json',
    '--output', 'tmp/ocr-dataset/report.json',
    '--split', 'training',
  ]), /split/i);
});

test('rejectsOutputOutsideIgnoredDatasetRoot', () => {
  assert.throws(() => parseBenchmarkArgs([
    '--manifest', 'ground-truth.json',
    '--output', 'tmp/benchmark.json',
  ]), /tmp\/ocr-dataset/i);
});

test('showsHelpWithoutLoadingOcr', async () => {
  let output = '';
  let workerStarted = false;
  const result = await runBenchmarkCli(['--help'], {
    workerFactory: async () => {
      workerStarted = true;
      throw new Error('Help must not initialize OCR.');
    },
    writeOutput: (value) => (output += value),
  });

  assert.equal(result.help, true);
  assert.match(output, /--manifest|--output/);
  assert.equal(workerStarted, false);
});
