#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateRealSamples } from './real-ocr-corpus.mjs';

// Manually transcribed visible labels from user-provided captures. Never use model predictions as truth.
const definitions = [
  {
    id: 'inventory-20261010',
    captureId: 'capture-3b5639390052',
    grid: [1289, 236, 37.5, 37.5, 30],
    columns: 8,
    quantityLabelsOnly: true,
    scanRegion: {
      bounds: { left: 1286, top: 233, width: 300, height: 112.5 },
      columns: 8,
      rows: 3,
      mode: 'inventory',
    },
    quantities: ['? 19 55 3 293 29 ? 8', '? ? ? 77 19 ? ? ?', '? 39 24 114 49'],
    items: {},
  },
  {
    id: 'velia-20261008',
    captureId: 'capture-ffdcee2fbd24',
    grid: [0, 0, 56.5, 56.4, 56],
    quantities: [
      '15000 25366 139.1k 113.8k 146.1k 219.0k 190 564 36',
      '561 203 40490 398 92 65 207.2k 377.3k 8297',
      '11031 4325 13903 6822 2707 12266 53703 27641 8767',
      '59759 7806 7309 104.7k 57302 1677 2652 834 343.6k',
      '13625 1.3M 6232 8992 244.8k 32201 67259 20074 3933',
      '9666 455.0k 144.4k 390.5k 79922 3214 244 7085 2320',
      '18919 312.0k 160.6k 239.5k 108 239.4k 143.7k 228.1k 21760',
      '4333 12594 8217 952 2585 1590 65033 124.7k 205.8k',
      '72486 65833 1011 236.7k 48503 3477 5 1236 3948',
      '81377 57 120.3k 89772 370.3k 9820 5500 451.3k 204.0k',
    ],
    items: { 47: 5302, 48: 5301, 72: 4802, 73: 4801 },
  },
  {
    id: 'velia-20261010',
    captureId: 'capture-3b5639390052',
    grid: [949, 210, 35.2, 35.2, 31],
    quantities: [
      '2 246 23567 29166 36485 30764 562 192 866',
      '299 946 2437 262 22 103 17104 3996 723',
      '319.7k 78492 57000 44900 11944 25032 59078 76809 13562',
      '15000 25366 109.1k 83777 146.0k 219.0k 190 564 36',
      '561 221 40490 453 92 65 206.8k 375.9k 8378',
      '11110 4411 13974 6897 2707 7266 48703 27641 8767',
      '49759 7806 7309 104.7k 57302 1677 2652 858 343.6k',
      '13625 1.3M 6232 8992 244.8k 32201 67259 20074 3933',
      '9666 454.9k 144.6k 311.0k 79922 3214 244 8641 2361',
      '18919 312.0k 160.6k 239.5k 108 239.5k 143.8k 179.6k 22936',
    ],
    items: { 74: 5302, 75: 5301 },
  },
];

export function visibleValue(text) {
  const match = /^(\d+(?:[.,]\d+)?)([kKmM])?$/.exec(text);
  if (!match) throw new Error('Invalid visible quantity');
  return String(
    Math.round(
      Number(match[1].replace(',', '.')) *
        (match[2]?.toLowerCase() === 'k' ? 1000 : match[2]?.toLowerCase() === 'm' ? 1000000 : 1),
    ),
  );
}

export async function buildRealSlotCorpus(
  manifestPath = 'data/ocr-corpus/manifest.json',
  outputPath = 'data/ocr-corpus/lifeskill-slots.json',
) {
  const corpus = JSON.parse(await readFile(manifestPath, 'utf8'));
  const samples = [];
  const sessions = new Map();
  for (const definition of definitions) {
    const capture = corpus.captures.find((c) => c.id === definition.captureId);
    if (!capture || capture.source !== 'user-provided')
      throw new Error('Authorized capture missing');
    const split = capture.sessionId.startsWith('session-2026-10-08') ? 'calibration' : 'evaluation';
    if (sessions.has(capture.sessionId) && sessions.get(capture.sessionId) !== split)
      throw new Error('Session crosses splits');
    sessions.set(capture.sessionId, split);
    const imagePath = path.join(path.dirname(manifestPath), capture.path);
    const bytes = await readFile(imagePath);
    if (createHash('sha256').update(bytes).digest('hex') !== capture.sha256)
      throw new Error('Capture hash mismatch');
    const [left, top, pitchX, pitchY, size] = definition.grid;
    const slots = definition.quantities.flatMap((row, y) =>
      row.split(' ').flatMap((displayedText, x) =>
        displayedText === '?'
          ? []
          : [
              {
                bounds: {
                  left: Math.round(left + x * pitchX),
                  top: Math.round(top + y * pitchY),
                  width: size,
                  height: size,
                },
                displayedText,
                normalizedValue: visibleValue(displayedText),
                approximate: /[kKmM]/.test(displayedText),
                // An icon alone cannot prove which catalog alias the player owns.
                itemId: null,
                iconReferenceId: definition.items[y * (definition.columns ?? 9) + x] ?? null,
                itemStatus: definition.items[y * (definition.columns ?? 9) + x]
                  ? 'icon-family-reference'
                  : 'unlabeled',
              },
            ],
      ),
    );
    samples.push({
      id: definition.id,
      imagePath,
      sha256: capture.sha256,
      sessionId: capture.sessionId,
      split,
      source: capture.source,
      labelSource: 'manual-visible-transcription',
      width: capture.width,
      height: capture.height,
      slots,
      quantityLabelsOnly: definition.quantityLabelsOnly ?? false,
      ...(definition.scanRegion ? { scanRegion: definition.scanRegion } : {}),
    });
  }
  const result = {
    schemaVersion: 1,
    valueSemantics: 'displayed-quantity-normalized-not-hidden-stack-count',
    samples,
  };
  validateRealSamples(samples);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (process.argv[1]?.endsWith('build-real-slot-corpus.mjs')) {
  const result = await buildRealSlotCorpus();
  process.stdout.write(
    JSON.stringify(
      result.samples.map((s) => ({ id: s.id, split: s.split, slots: s.slots.length })),
    ) + '\n',
  );
}
