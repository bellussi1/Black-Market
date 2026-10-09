// Local reproducible calibration. Screenshots and private ground truth stay outside Git.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { findEquipmentFrames } from '../apps/web/src/app/features/scans/equipment-slots.ts';
import { isDefinitelyEmptySlot } from '../apps/web/src/app/features/scans/slot-visibility.ts';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = require('sharp');
const ts = require('typescript');
const moduleUrl = (source) =>
  'data:text/javascript;base64,' +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText,
  ).toString('base64');
const glyphs = moduleUrl(
  await readFile(
    new URL('../apps/web/src/app/features/scans/quantity-glyphs.ts', import.meta.url),
    'utf8',
  ),
);
const quantitySource = (
  await readFile(
    new URL('../apps/web/src/app/features/scans/quantity-pixels.ts', import.meta.url),
    'utf8',
  )
).replace("'./quantity-glyphs'", JSON.stringify(glyphs));
const { readQuantityPixels } = await import(moduleUrl(quantitySource));
const manifest = process.argv[2];
if (!manifest) throw new Error('Informe um manifesto local JSON, conforme docs/screenshot-mvp.md.');
const samples = JSON.parse(await readFile(resolve(manifest), 'utf8'));
if (!Array.isArray(samples) || !samples.length || samples.length > 100)
  throw new Error('Use de 1 a 100 casos.');
const reports = [];
let peakRss = process.memoryUsage().rss;
for (const sample of samples) {
  const started = performance.now();
  const metadata = await sharp(sample.path).metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 12_000_000)
    throw new Error('Imagem fora do limite.');
  const quantities = [];
  let emptyChecks = 0,
    emptyCorrect = 0;
  for (const slot of sample.slots ?? []) {
    const { left, top, width, height } = slot.bounds;
    const crop = {
      left: Math.round(left + width * 0.03),
      top: Math.round(top + height * 0.57),
      width: Math.round(width * 0.94),
      height: Math.round(height * 0.37),
    };
    const { data, info } = await sharp(sample.path)
      .extract(crop)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const reading = readQuantityPixels(data, info.width, info.height);
    quantities.push({
      expected: slot.quantity ?? null,
      actual: reading?.text ?? null,
      score: reading?.confidence ?? null,
      correct: (reading?.text ?? null) === (slot.quantity ?? null),
    });
    if (typeof slot.empty === 'boolean') {
      const bounds = {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
      };
      const rgba = await sharp(sample.path)
        .extract(bounds)
        .resize(32, 32, { fit: 'fill' })
        .ensureAlpha()
        .raw()
        .toBuffer();
      emptyChecks++;
      emptyCorrect += Number(isDefinitelyEmptySlot(rgba, 32, 32) === slot.empty);
    }
  }
  let gearFrames = null;
  if (sample.equipment) {
    const { data, info } = await sharp(sample.path)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    gearFrames = findEquipmentFrames({ data, width: info.width, height: info.height }).length;
  }
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  reports.push({
    case: sample.label ?? 'Captura',
    quantityChecks: quantities.length,
    quantityCorrect: quantities.filter((row) => row.correct).length,
    quantityUnread: quantities.filter((row) => row.expected !== null && row.actual === null).length,
    numberChecks: quantities.filter((row) => row.expected !== null).length,
    wrongRecognizedNumbers: quantities.filter((row) => row.actual !== null && !row.correct).length,
    noCounterChecks: quantities.filter((row) => row.expected === null).length,
    quantities,
    emptyChecks,
    emptyCorrect,
    gearFrames,
    ms: Math.round(performance.now() - started),
  });
}
console.log(
  JSON.stringify(
    {
      scope:
        'Leitor numérico local e slots. Não mede identificação de IDs, OCR de fallback, precisão geral ou tempo do lote no navegador.',
      reports,
      peakRssMiB: Math.round(peakRss / 1024 / 1024),
    },
    null,
    2,
  ),
);
if (
  reports.some(
    (row) => row.quantityCorrect !== row.quantityChecks || row.emptyCorrect !== row.emptyChecks,
  )
)
  process.exitCode = 1;
