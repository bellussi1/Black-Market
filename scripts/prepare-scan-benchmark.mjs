#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { benchmarkScanPage } from './browser-scan-benchmark.mjs';
import { verifyRealImages } from './real-ocr-corpus.mjs';

const [manifestPath, sampleId] = process.argv.slice(2);
if (!manifestPath || !/^[a-zA-Z0-9-]+$/.test(sampleId ?? ''))
  throw new Error('Usage: node scripts/prepare-scan-benchmark.mjs manifest.json sample-id');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await verifyRealImages(manifest.samples);
const sample = manifest.samples.find((row) => row.id === sampleId);
if (!sample) throw new Error('Sample not found');
const output = `tmp/ocr-dataset/${sampleId}-browser.js`;
await mkdir('tmp/ocr-dataset', { recursive: true });
await writeFile(
  output,
  `async (page) => { const benchmark = ${benchmarkScanPage.toString()}; return benchmark(page, ${JSON.stringify(sample.imagePath)}, ${JSON.stringify(sample.scanRegion ?? null)}); }\n`,
);
process.stdout.write(output + '\n');
