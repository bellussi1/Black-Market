import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import {
  buildSyntheticSample,
  createSyntheticLayout,
  formatQuantityLabel,
  generateSyntheticDataset,
  parseGeneratorArgs,
  readPublishedIconCatalog,
} from './generate-synthetic-ocr-dataset.mjs';

const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = requireApi('sharp');
const temporaryDirectories = [];

async function makeCatalog(redirects = { 'urn::item:100': 'icons/100.webp' }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bdo-ocr-catalog-'));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, 'icons'), { recursive: true });
  await sharp({
    create: { width: 24, height: 24, channels: 4, background: { r: 191, g: 124, b: 44, alpha: 1 } },
  })
    .webp()
    .toFile(path.join(directory, 'icons/100.webp'));
  await writeFile(path.join(directory, 'asset_redirects.json'), JSON.stringify(redirects));
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('rejectsUnsafeCatalogPaths', async () => {
  const catalogDir = await makeCatalog({
    'urn::item:100': '../outside.webp',
    'urn::item:101': 'icons/not-webp.png',
  });

  await assert.rejects(readPublishedIconCatalog(catalogDir), /unsafe|WebP|path/i);
});

test('rejectsMissingOrEmptyCatalog', async () => {
  await assert.rejects(readPublishedIconCatalog(undefined), /--catalog/);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bdo-ocr-empty-catalog-'));
  temporaryDirectories.push(directory);
  await writeFile(
    path.join(directory, 'asset_redirects.json'),
    JSON.stringify({ 'urn::item:100': 'icons/missing.webp' }),
  );
  await assert.rejects(readPublishedIconCatalog(directory), /no readable item WebP icons/i);
});

test('usesPublishedItemAliasesOnly', async () => {
  const catalogDir = await makeCatalog({
    'urn::item:100': 'icons/100.webp',
    'urn::npc:900': 'icons/100.webp',
    'urn::item:invalid': 'icons/100.webp',
  });

  const catalog = await readPublishedIconCatalog(catalogDir);

  assert.deepEqual(
    catalog.map(({ itemId }) => itemId),
    ['100'],
  );
  assert.equal(path.basename(catalog[0].absolutePath), '100.webp');
});

test('repeatsTheSameSampleForTheSameSeed', async () => {
  const catalog = await readPublishedIconCatalog(await makeCatalog());
  const options = {
    sampleId: 'sample-00001',
    seed: 4102026,
    width: 640,
    height: 480,
    uiScale: 1,
    columns: 8,
    panelType: 'storage',
    noiseLevel: 1,
    jpegQuality: 82,
    catalog,
  };

  const first = await buildSyntheticSample(options);
  const same = await buildSyntheticSample(options);
  const changed = await buildSyntheticSample({ ...options, seed: 4102027 });

  assert.deepEqual(first.sample.slots, same.sample.slots);
  assert.equal(first.sample.sha256, same.sample.sha256);
  assert.deepEqual(first.image, same.image);
  assert.notEqual(first.sample.sha256, changed.sample.sha256);
});

test('coversEveryResolutionScaleAndColumnCount', () => {
  const resolutions = [
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ];
  const variants = resolutions.flatMap(([width, height]) =>
    [1, 1.1, 1.2].flatMap((uiScale) =>
      [8, 9].map((columns) => createSyntheticLayout({ width, height, uiScale, columns })),
    ),
  );

  assert.equal(variants.length, 18);
  assert.deepEqual(new Set(variants.map(({ columns }) => columns)), new Set([8, 9]));
  assert.deepEqual(
    new Set(variants.map(({ width, height }) => `${width}x${height}`)),
    new Set(['1920x1080', '2560x1440', '3840x2160']),
  );
  assert.deepEqual(new Set(variants.map(({ uiScale }) => uiScale)), new Set([1, 1.1, 1.2]));
  assert.ok(variants.every(({ grid: { slotWidth } }) => slotWidth >= 14 && slotWidth <= 160));
});

test('keepsAllSlotBoundsInsideTheImage', () => {
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ]) {
    for (const uiScale of [1, 1.1, 1.2]) {
      for (const columns of [8, 9]) {
        const layout = createSyntheticLayout({ width, height, uiScale, columns });
        for (const slot of layout.slots) {
          assert.ok(slot.bounds.left >= 0 && slot.bounds.top >= 0);
          assert.ok(slot.bounds.left + slot.bounds.width <= width);
          assert.ok(slot.bounds.top + slot.bounds.height <= height);
        }
      }
    }
  }
});

test('recordsAndAppliesNoiseAndJpegQuality', async () => {
  const catalog = await readPublishedIconCatalog(await makeCatalog());
  const common = {
    sampleId: 'sample-00003',
    seed: 901,
    width: 640,
    height: 480,
    uiScale: 1,
    columns: 8,
    panelType: 'inventory',
    catalog,
  };
  const clean = await buildSyntheticSample({ ...common, noiseLevel: 0, jpegQuality: 92 });
  const noisy = await buildSyntheticSample({ ...common, noiseLevel: 2, jpegQuality: 68 });
  const metadata = await sharp(noisy.image).metadata();

  assert.equal(noisy.sample.noiseLevel, 2);
  assert.equal(noisy.sample.jpegQuality, 68);
  assert.equal(metadata.format, 'jpeg');
  assert.notEqual(clean.sample.sha256, noisy.sample.sha256);
});

test('labelsOccupiedAndEmptySlotsCorrectly', async () => {
  const catalog = await readPublishedIconCatalog(await makeCatalog());
  const results = await Promise.all(
    [1, 2, 3].map((sample) =>
      buildSyntheticSample({
        sampleId: `sample-${String(sample).padStart(5, '0')}`,
        seed: 4102026,
        width: 640,
        height: 480,
        uiScale: 1,
        columns: 8,
        panelType: 'inventory',
        noiseLevel: 0,
        jpegQuality: 90,
        catalog,
      }),
    ),
  );
  const result = results[0];
  const occupied = result.sample.slots.filter((slot) => slot.itemId);
  const empty = result.sample.slots.filter((slot) => !slot.itemId);
  const romanLabels = new Set(
    results.flatMap(({ sample }) =>
      sample.slots
        .filter((slot) => slot.labelKind === 'enhancement')
        .map((slot) => slot.displayedText),
    ),
  );

  assert.equal(
    occupied.length + empty.length,
    result.sample.grid.columns * result.sample.grid.rows,
  );
  assert.ok(
    occupied.every(
      (slot) =>
        slot.labelKind &&
        slot.displayedText &&
        slot.normalizedValue !== undefined &&
        slot.labelBounds,
    ),
  );
  assert.ok(empty.every((slot) => !slot.labelKind && !slot.displayedText && !slot.labelBounds));
  assert.ok(occupied.every((slot) => slot.itemId === '100'));
  assert.ok(occupied.every((slot) => slot.labelStrokeWidth === 1 || slot.labelStrokeWidth === 2));
  assert.equal(formatQuantityLabel(139100), '139.1k');
  assert.equal(formatQuantityLabel(319900), '319.9k');
  assert.equal(formatQuantityLabel(1300000), '1.3M');
  assert.deepEqual(
    romanLabels,
    new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']),
  );
  assert.ok(
    occupied.some(
      (slot) =>
        slot.labelKind === 'quantity' &&
        Number(slot.normalizedValue) >= 1 &&
        Number(slot.normalizedValue) <= 999,
    ),
  );
});

test('generatesMarkedManifestWithExactHashes', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'bdo-ocr-output-'));
  temporaryDirectories.push(parent);
  const outputDir = path.join(parent, 'synthetic');
  const catalogDir = await makeCatalog();

  const result = await generateSyntheticDataset({
    count: 2,
    seed: 4102026,
    split: 'calibration',
    outputDir,
    catalogDir,
  });
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));

  assert.equal(result.sampleCount, 2);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.samples.length, 2);
  assert.ok(
    manifest.samples.every(
      (sample) => sample.split === 'calibration' && sample.sha256.length === 64,
    ),
  );
  for (const sample of manifest.samples) {
    const image = await readFile(path.join(outputDir, sample.path));
    assert.equal(createHash('sha256').update(image).digest('hex'), sample.sha256);
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.width, sample.width);
    assert.equal(metadata.height, sample.height);
    assert.equal(metadata.format, 'jpeg');
  }
  assert.deepEqual(parseGeneratorArgs(['--count', '18', '--seed', '7', '--split', 'evaluation']), {
    count: 18,
    seed: 7,
    split: 'evaluation',
    outputDir: path.resolve('tmp/ocr-dataset/synthetic'),
    catalogDir: undefined,
    overwrite: false,
  });
});
