#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = requireApi('sharp');
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultOutputDir = path.resolve(scriptDirectory, '../tmp/ocr-dataset/synthetic');
const markerName = '.bdo-ocr-synthetic.json';
const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const visibleQuantityExamples = ['1', '139.1k', '319.9k', '1.3M', '42', '999'];
const variants = [1920, 2560, 3840].flatMap((width) => {
  const height = Math.round((width * 9) / 16);
  return [1, 1.1, 1.2].flatMap((uiScale) =>
    [8, 9].map((columns) => ({ width, height, uiScale, columns })),
  );
});

export const GENERATOR_VERSION = 1;

function usage() {
  return [
    'Usage: node scripts/generate-synthetic-ocr-dataset.mjs [options]',
    '',
    'Options:',
    '  --count <n>          Number of images to generate (default: 18)',
    '  --seed <n>           Deterministic seed (default: 4102026)',
    '  --split <name>        calibration or evaluation (default: calibration)',
    '  --catalog <path>      Published catalog directory containing asset_redirects.json',
    '  --output <path>       Output directory (default: tmp/ocr-dataset/synthetic)',
    '  --overwrite           Replace files from a marked synthetic dataset only',
    '  --help                Show this help',
  ].join('\n');
}

export function parseGeneratorArgs(argv) {
  const options = {
    count: 18,
    seed: 4102026,
    split: 'calibration',
    outputDir: defaultOutputDir,
    catalogDir: undefined,
    overwrite: false,
  };
  const names = new Map([
    ['--count', 'count'],
    ['--seed', 'seed'],
    ['--split', 'split'],
    ['--catalog', 'catalogDir'],
    ['--output', 'outputDir'],
  ]);

  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === '--help' || flag === '-h') return { help: usage() };
    if (flag === '--overwrite') {
      options.overwrite = true;
      continue;
    }
    const key = names.get(flag);
    if (!key) throw new Error(`Unknown option: ${flag}`);
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (key === 'count' || key === 'seed') {
      if (!/^\d+$/.test(value)) throw new Error(`${flag} must be a positive integer.`);
      options[key] = Number(value);
    } else if (key === 'split') {
      options.split = value;
    } else if (key === 'catalogDir') {
      options.catalogDir = path.resolve(value);
    } else {
      options.outputDir = path.resolve(value);
    }
  }

  if (!Number.isSafeInteger(options.count) || options.count < 1 || options.count > 10_000)
    throw new Error('--count must be an integer between 1 and 10000.');
  if (!Number.isSafeInteger(options.seed) || options.seed < 1 || options.seed > 0xffffffff)
    throw new Error('--seed must be an integer between 1 and 4294967295.');
  if (!['calibration', 'evaluation'].includes(options.split))
    throw new Error('--split must be calibration or evaluation.');
  return options;
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

export async function readPublishedIconCatalog(catalogDir) {
  if (!catalogDir)
    throw new Error('Provide --catalog with a published catalog containing asset_redirects.json.');
  const suppliedPath = path.resolve(catalogDir);
  let manifestPath = suppliedPath;
  try {
    const suppliedStat = await stat(suppliedPath);
    if (suppliedStat.isDirectory()) manifestPath = path.join(suppliedPath, 'asset_redirects.json');
  } catch {
    throw new Error(`Catalog path does not exist: ${suppliedPath}`);
  }

  let redirects;
  try {
    redirects = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read catalog asset_redirects.json: ${error.message}`);
  }
  if (!redirects || typeof redirects !== 'object' || Array.isArray(redirects))
    throw new Error('Catalog asset_redirects.json must contain an object of published aliases.');

  const root = await realpath(path.dirname(manifestPath));
  const uniquePaths = new Map();
  for (const [alias, rawRelativePath] of Object.entries(redirects)) {
    const match = /^urn::item:(\d+)$/.exec(alias);
    if (!match) continue;
    if (typeof rawRelativePath !== 'string' || !rawRelativePath.trim())
      throw new Error(`Published item alias ${alias} has no icon path.`);
    const normalized = rawRelativePath.replaceAll('\\', '/');
    const segments = normalized.split('/');
    if (
      path.posix.isAbsolute(normalized) ||
      /^[A-Za-z]:/.test(normalized) ||
      segments.some((segment) => segment === '..' || segment === '.') ||
      path.posix.extname(normalized).toLowerCase() !== '.webp'
    )
      throw new Error(
        `Published item alias ${alias} uses an unsafe path or unsupported icon extension.`,
      );
    const candidate = path.resolve(root, ...segments);
    if (!isWithin(root, candidate))
      throw new Error(`Published item alias ${alias} escapes the catalog directory.`);
    if (uniquePaths.has(candidate)) continue;
    try {
      const actualPath = await realpath(candidate);
      if (!isWithin(root, actualPath))
        throw new Error(`Published item alias ${alias} resolves outside the catalog directory.`);
      const metadata = await stat(actualPath);
      if (!metadata.isFile()) continue;
      uniquePaths.set(candidate, { itemId: match[1], absolutePath: actualPath });
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
  }

  const catalog = [...uniquePaths.values()];
  if (!catalog.length)
    throw new Error(
      'The published catalog has no readable item WebP icons. Check --catalog and its asset files.',
    );
  return catalog.sort((left, right) =>
    left.itemId.localeCompare(right.itemId, 'en', { numeric: true }),
  );
}

function createRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function imageSeed(seed, sampleId) {
  const hash = createHash('sha256').update(`${seed}:${sampleId}`).digest();
  return hash.readUInt32LE(0) || 1;
}

function randomInteger(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function parseDisplayedQuantity(text) {
  const normalized = text.replaceAll(',', '.');
  const compact = /^(\d+)(?:\.(\d+))?([kM])$/.exec(normalized);
  if (compact) {
    const scale = compact[3] === 'k' ? 1000 : 1_000_000;
    return {
      value: Math.round(Number(`${compact[1]}.${compact[2] ?? '0'}`) * scale),
      approximate: true,
    };
  }
  const value = Number(text);
  return { value, approximate: false };
}

export function formatQuantityLabel(value) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error('Quantity must be a positive safe integer.');
  if (value === 139100 || value === 319900 || value === 1300000)
    return visibleQuantityExamples.find((label) => parseDisplayedQuantity(label).value === value);
  if (value < 1000) return String(value);
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}M`;
  return `${Number((value / 1000).toFixed(1))}k`;
}

function quantityForSlot(index, random) {
  const example = visibleQuantityExamples[index % visibleQuantityExamples.length];
  if (example === '139.1k' || example === '319.9k' || example === '1.3M') return example;
  if (index % visibleQuantityExamples.length === 0 && index < 1000)
    return String(randomInteger(random, 1, 999));
  return formatQuantityLabel(randomInteger(random, 1, 999));
}

function labelLayout(text, slot, pitch) {
  const nominalSize = Math.max(8, Math.round(pitch * 0.24));
  const fontSize = Math.max(
    7,
    Math.min(nominalSize, Math.floor((pitch - 8) / (text.length * 0.62))),
  );
  const estimatedWidth = Math.min(pitch - 6, Math.ceil(fontSize * text.length * 0.62 + 3));
  const right = slot.bounds.left + slot.bounds.width - 4;
  const baseline = slot.bounds.top + slot.bounds.height - 4;
  const labelBounds = {
    left: Math.max(slot.bounds.left + 2, right - estimatedWidth),
    top: Math.max(slot.bounds.top + 2, baseline - fontSize - 2),
    width: estimatedWidth,
    height: fontSize + 2,
  };
  return { fontSize, right, baseline, labelBounds };
}

export function createSyntheticLayout({ width, height, uiScale, columns, rows = 6 }) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 320 || height < 240)
    throw new Error('Synthetic image dimensions must be positive and at least 320×240.');
  if (![1, 1.1, 1.2].includes(uiScale)) throw new Error('UI scale must be 1, 1.1, or 1.2.');
  if (![8, 9].includes(columns)) throw new Error('Synthetic grids must use 8 or 9 columns.');
  const pitch = Math.round(Math.min(height / 20, 126) * uiScale);
  const gridWidth = columns * pitch;
  const gridHeight = rows * pitch;
  const left = Math.round((width - gridWidth) / 2);
  const top = Math.round((height - gridHeight) / 2);
  const slots = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      slots.push({
        row,
        column,
        bounds: {
          left: left + column * pitch,
          top: top + row * pitch,
          width: pitch,
          height: pitch,
        },
      });
    }
  }
  return {
    width,
    height,
    uiScale,
    columns,
    rows,
    grid: { left, top, columns, rows, slotWidth: pitch, slotHeight: pitch },
    slots,
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function makeBackgroundSvg({ width, height, panelType, grid, slots, noiseLevel, random }) {
  const pitch = grid.slotWidth;
  const panelX = grid.left - 18;
  const panelY = grid.top - 54;
  const panelWidth = grid.columns * pitch + 36;
  const panelHeight = grid.rows * pitch + 76;
  const title = panelType === 'storage' ? 'Armazém de Velia' : 'Inventário';
  const speckles = [];
  const count = noiseLevel * 85;
  for (let index = 0; index < count; index++) {
    const x = randomInteger(random, 0, width - 1);
    const y = randomInteger(random, 0, height - 1);
    const alpha = (0.025 + random() * 0.045).toFixed(3);
    const size = random() > 0.9 ? 2 : 1;
    speckles.push(
      `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#d2c7b0" opacity="${alpha}"/>`,
    );
  }
  const slotFrames = slots
    .map(({ bounds }) => {
      const { left, top, width: slotWidth, height: slotHeight } = bounds;
      return `<rect x="${left}" y="${top}" width="${slotWidth}" height="${slotHeight}" fill="#171716" stroke="#777064" stroke-width="2"/><rect x="${left + 3}" y="${top + 3}" width="${slotWidth - 6}" height="${slotHeight - 6}" fill="#252422" stroke="#090909" stroke-width="2"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#282723"/><stop offset="1" stop-color="#121210"/></linearGradient><linearGradient id="panel" x2="0" y2="1"><stop stop-color="#4a453b"/><stop offset="1" stop-color="#282724"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/>${speckles.join('')}<rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="5" fill="url(#panel)" stroke="#9b8357" stroke-width="3"/><rect x="${panelX + 3}" y="${panelY + 3}" width="${panelWidth - 6}" height="42" fill="#766142"/><path d="M${panelX + 3} ${panelY + 45}H${panelX + panelWidth - 3}" stroke="#c6aa71" stroke-width="1"/><text x="${panelX + 22}" y="${panelY + 31}" fill="#e3d8c0" font-family="Arial,sans-serif" font-size="${Math.max(18, Math.round(pitch * 0.3))}" font-weight="bold">${escapeXml(title)}</text>${slotFrames}</svg>`;
}

function makeLabelsSvg({ width, height, slots }) {
  const labels = slots
    .filter((slot) => slot.labelKind)
    .map((slot) => {
      const { fontSize, right, baseline, labelBounds } = slot.textLayout;
      return `<text x="${right}" y="${baseline}" text-anchor="end" fill="#f3eee3" stroke="#050505" stroke-width="${slot.labelStrokeWidth}" stroke-linejoin="round" paint-order="stroke fill" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold">${escapeXml(slot.displayedText)}</text>`;
    })
    .join('');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${labels}</svg>`,
  );
}

function chooseSlotContent({ slot, slotIndex, sampleIndex, panelType, random, catalog }) {
  const sequence = sampleIndex * 54 + slotIndex;
  const enhancement = panelType === 'inventory' && sequence % 9 === 8;
  const occupied = slotIndex < 4 || enhancement || random() < 0.72;
  if (!occupied)
    return { ...slot, itemId: undefined, labelKind: undefined, displayedText: undefined };
  const icon = catalog[randomInteger(random, 0, catalog.length - 1)];
  const labelKind = enhancement ? 'enhancement' : 'quantity';
  const displayedText = enhancement
    ? romanNumerals[Math.floor(sequence / 9) % romanNumerals.length]
    : quantityForSlot(sequence, random);
  const parsed = enhancement
    ? { value: romanNumerals.indexOf(displayedText) + 1, approximate: false }
    : parseDisplayedQuantity(displayedText);
  const textLayout = labelLayout(displayedText, slot, slot.bounds.width);
  return {
    ...slot,
    itemId: icon.itemId,
    iconPath: icon.absolutePath,
    labelKind,
    displayedText,
    normalizedValue: parsed.value,
    approximate: parsed.approximate,
    labelStrokeWidth: sequence % 2 === 0 ? 1 : 2,
    labelBounds: textLayout.labelBounds,
    textLayout,
  };
}

export async function buildSyntheticSample({
  sampleId,
  seed,
  width,
  height,
  uiScale,
  columns,
  panelType,
  noiseLevel,
  jpegQuality,
  catalog,
}) {
  if (
    !sampleId ||
    !Number.isSafeInteger(seed) ||
    seed < 1 ||
    !Array.isArray(catalog) ||
    !catalog.length
  )
    throw new Error(
      'A sample ID, positive seed, and non-empty published icon catalog are required.',
    );
  if (!['storage', 'inventory'].includes(panelType))
    throw new Error('Panel type must be storage or inventory.');
  if (![0, 1, 2].includes(noiseLevel)) throw new Error('Noise level must be 0, 1, or 2.');
  if (!Number.isSafeInteger(jpegQuality) || jpegQuality < 55 || jpegQuality > 95)
    throw new Error('JPEG quality must be an integer from 55 to 95.');
  const layout = createSyntheticLayout({
    width,
    height,
    uiScale,
    columns,
    rows: panelType === 'storage' ? 6 : 5,
  });
  const random = createRandom(imageSeed(seed, sampleId));
  const sampleIndex = Math.max(0, Number(sampleId.match(/(\d+)$/)?.[1] ?? 1) - 1);
  const slots = layout.slots.map((slot, slotIndex) =>
    chooseSlotContent({ slot, slotIndex, sampleIndex, panelType, random, catalog }),
  );
  const baseSvg = makeBackgroundSvg({
    width,
    height,
    panelType,
    grid: layout.grid,
    slots,
    noiseLevel,
    random,
  });
  const icons = [];
  for (const slot of slots) {
    if (!slot.itemId) continue;
    const inset = Math.max(4, Math.round(slot.bounds.width * 0.12));
    const iconSize = slot.bounds.width - inset * 2;
    const iconBuffer = await sharp(slot.iconPath)
      .resize(iconSize, iconSize, { fit: 'contain' })
      .png()
      .toBuffer();
    icons.push({ input: iconBuffer, left: slot.bounds.left + inset, top: slot.bounds.top + inset });
  }
  const base = await sharp(Buffer.from(baseSvg)).composite(icons).png().toBuffer();
  const image = await sharp(base)
    .composite([{ input: makeLabelsSvg({ width, height, slots }) }])
    .jpeg({ quality: jpegQuality, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
  const hash = createHash('sha256').update(image).digest('hex');
  const manifestSlots = slots.map(
    ({ iconPath: _iconPath, textLayout: _textLayout, ...slot }) => slot,
  );
  return {
    image,
    sample: {
      id: sampleId,
      path: `images/${sampleId}.jpg`,
      sha256: hash,
      width,
      height,
      seed,
      split: undefined,
      uiScale,
      noiseLevel,
      jpegQuality,
      panelType,
      language: 'pt-BR',
      grid: layout.grid,
      slots: manifestSlots,
    },
  };
}

function variantFor(index) {
  return variants[index % variants.length];
}

async function prepareOutputDirectory(outputDir, overwrite) {
  const absoluteOutput = path.resolve(outputDir);
  await mkdir(absoluteOutput, { recursive: true });
  const entries = await readdir(absoluteOutput);
  if (!entries.length) {
    await writeFile(
      path.join(absoluteOutput, markerName),
      JSON.stringify({ generator: 'bdo-ocr-synthetic', schemaVersion: 1 }, null, 2),
    );
    return absoluteOutput;
  }
  if (!overwrite)
    throw new Error(
      `Output directory is not empty. Use --overwrite only for this generator's marked dataset: ${absoluteOutput}`,
    );
  const markerPath = path.join(absoluteOutput, markerName);
  const manifestPath = path.join(absoluteOutput, 'ground-truth.json');
  let marker;
  let manifest;
  try {
    marker = JSON.parse(await readFile(markerPath, 'utf8'));
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    throw new Error(
      'Refusing to overwrite: output must contain this generator marker and a valid ground-truth.json.',
    );
  }
  if (
    marker.generator !== 'bdo-ocr-synthetic' ||
    marker.schemaVersion !== 1 ||
    manifest.schemaVersion !== 1 ||
    !Array.isArray(manifest.samples)
  )
    throw new Error('Refusing to overwrite an unmarked or invalid synthetic output directory.');
  for (const sample of manifest.samples) {
    if (typeof sample.path !== 'string' || !/^images\/[A-Za-z0-9_-]+\.jpg$/.test(sample.path))
      throw new Error('Refusing to overwrite a manifest with an unsafe image path.');
    const imagePath = path.resolve(absoluteOutput, sample.path);
    if (!isWithin(absoluteOutput, imagePath))
      throw new Error('Refusing to overwrite a manifest with a path outside its output directory.');
    await rm(imagePath, { force: true });
  }
  await rm(manifestPath, { force: true });
  await mkdir(path.join(absoluteOutput, 'images'), { recursive: true });
  return absoluteOutput;
}

export async function generateSyntheticDataset({
  count,
  seed,
  split = 'calibration',
  outputDir = defaultOutputDir,
  catalogDir,
  overwrite = false,
}) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 10_000)
    throw new Error('Count must be an integer between 1 and 10000.');
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 0xffffffff)
    throw new Error('Seed must be an integer between 1 and 4294967295.');
  if (!['calibration', 'evaluation'].includes(split))
    throw new Error('Split must be calibration or evaluation.');
  const catalog = await readPublishedIconCatalog(catalogDir);
  const absoluteOutput = await prepareOutputDirectory(outputDir, overwrite);
  const imageDirectory = path.join(absoluteOutput, 'images');
  await mkdir(imageDirectory, { recursive: true });
  const samples = [];

  for (let index = 0; index < count; index++) {
    const variant = variantFor(index);
    const sampleId = `sample-${String(index + 1).padStart(5, '0')}`;
    const panelType = index % 2 === 0 ? 'storage' : 'inventory';
    const noiseLevel = index % 3;
    const jpegQuality = 70 + (index % 6) * 4;
    const result = await buildSyntheticSample({
      sampleId,
      seed,
      ...variant,
      panelType,
      noiseLevel,
      jpegQuality,
      catalog,
    });
    result.sample.split = split;
    await writeFile(path.join(absoluteOutput, result.sample.path), result.image);
    samples.push(result.sample);
  }

  const manifest = {
    schemaVersion: 1,
    generator: 'bdo-ocr-synthetic',
    generatorVersion: GENERATOR_VERSION,
    seed,
    split,
    count,
    samples,
  };
  const manifestPath = path.join(absoluteOutput, 'ground-truth.json');
  const temporaryManifest = `${manifestPath}.tmp`;
  await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporaryManifest, manifestPath);
  return { sampleCount: samples.length, manifestPath };
}

async function runCli(argv) {
  const options = parseGeneratorArgs(argv);
  if (options.help) {
    process.stdout.write(`${options.help}\n`);
    return;
  }
  const result = await generateSyntheticDataset(options);
  process.stdout.write(
    `Generated ${result.sampleCount} synthetic OCR samples.\nManifest: ${result.manifestPath}\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`Synthetic OCR generation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
