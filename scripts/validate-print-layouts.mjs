// Local calibration only. No screenshot is uploaded, copied or committed by this command.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { detectGridAreas } from '../apps/web/src/app/features/scans/storage-grid.ts';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const sharp = require('sharp');
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Informe um manifesto JSON local. Veja docs/ocr-validation.md.');
const cases = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
if (!Array.isArray(cases) || !cases.length || cases.length > 100)
  throw new Error('O manifesto deve conter de 1 a 100 capturas.');
const reports = [];
for (const [index, sample] of cases.entries()) {
  const metadata = await sharp(sample.path).metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 12_000_000)
    throw new Error('Captura fora do limite de dimensões.');
  const scale = Math.min(1, 1100 / Math.max(metadata.width, metadata.height));
  const { data, info } = await sharp(sample.path)
    .resize(Math.round(metadata.width * scale), Math.round(metadata.height * scale), {
      fit: 'fill',
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const start = performance.now();
  const areas = detectGridAreas({ data, width: info.width, height: info.height, channels: 3 });
  const expected = sample.areas ?? [];
  const matched = new Set();
  const passed = sample.manual
    ? areas.length === 0
    : expected.length > 0 &&
      expected.every((area) => {
        const foundIndex = areas.findIndex((found, candidateIndex) => {
          if (matched.has(candidateIndex)) return false;
          if (area.columns !== found.columns || area.rows !== found.rows) return false;
          if (!area.bounds) return true;
          const expectedBounds = area.bounds;
          const tolerance = area.tolerance ?? 10;
          return ['left', 'top', 'width', 'height'].every(
            (key) => Math.abs(found.bounds[key] / scale - expectedBounds[key]) <= tolerance,
          );
        });
        if (foundIndex === -1) return false;
        matched.add(foundIndex);
        return true;
      });
  reports.push({
    case: sample.label ?? `Captura ${index + 1}`,
    passed,
    ms: Math.round(performance.now() - start),
    areas: areas.map((area) => ({
      ...area,
      bounds: Object.fromEntries(
        Object.entries(area.bounds).map(([key, value]) => [key, Math.round(value / scale)]),
      ),
    })),
  });
}
console.log(JSON.stringify(reports, null, 2));
if (reports.some((report) => !report.passed)) process.exitCode = 1;
