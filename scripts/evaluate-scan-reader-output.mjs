#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

/** Score actual browser Scan output without feeding labels to the readers. */
export function scoreScanOutput(sample, output) {
  const expected = sample.slots.filter((slot) => slot.itemId);
  const matched = new Set();
  let itemsExact = 0;
  let quantitiesExact = 0;
  let quantitiesAccepted = 0;
  let falsePositiveSlots = 0;
  for (const cell of output.cells) {
    const a = cell.rect;
    if (!a) continue;
    const ranked = expected
      .map((slot, index) => {
        const b = slot.bounds;
        const intersection =
          Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
          Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
        return {
          slot,
          index,
          iou: intersection / (a.width * a.height + b.width * b.height - intersection),
        };
      })
      .filter((row) => !matched.has(row.index))
      .sort((a, b) => b.iou - a.iou);
    const hit = ranked[0];
    if (!hit || hit.iou < 0.5) {
      falsePositiveSlots++;
      continue;
    }
    matched.add(hit.index);
    if (String(cell.item) === String(hit.slot.itemId)) itemsExact++;
    if (!cell.uncertain && cell.quantity) {
      quantitiesAccepted++;
      if (String(cell.quantity) === String(hit.slot.normalizedValue)) quantitiesExact++;
    }
  }
  return {
    sampleId: sample.id,
    expectedOccupiedSlots: expected.length,
    matchedSlots: matched.size,
    falsePositiveSlots,
    itemTop1: { exact: itemsExact, accuracy: itemsExact / expected.length },
    acceptedQuantities: {
      total: quantitiesAccepted,
      exact: quantitiesExact,
      accuracy: quantitiesExact / expected.length,
      precision: quantitiesAccepted ? quantitiesExact / quantitiesAccepted : null,
    },
    limitations: [
      'Single sample diagnostic; not independent real-world accuracy.',
      'Identical catalog icons can represent multiple item IDs.',
      'Uncertain suggestions are excluded from accepted quantity accuracy.',
    ],
  };
}

if (process.argv[1]?.endsWith('evaluate-scan-reader-output.mjs')) {
  const [manifestPath, sampleId, logPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !sampleId || !logPath || !outputPath)
    throw new Error(
      'Usage: node scripts/evaluate-scan-reader-output.mjs manifest sample-id browser-log report.json',
    );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const sample = manifest.samples.find((row) => row.id === sampleId);
  if (!sample) throw new Error('Sample not present in manifest.');
  const log = await readFile(logPath, 'utf8');
  const output = JSON.parse(log.split('### Result')[1].trim().split('\n')[0]);
  const report = scoreScanOutput(sample, output);
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
}
