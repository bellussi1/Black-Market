#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

/** Score actual browser Scan output without feeding labels to the readers. */
export function scoreScanOutput(sample, output) {
  const expected = sample.slots.filter((slot) => slot.normalizedValue !== undefined || slot.itemId);
  const expectedItems = expected.filter(
    (slot) => slot.itemId !== null && slot.itemId !== undefined,
  ).length;
  const matched = new Set();
  let itemsExact = 0;
  let quantitiesExact = 0;
  let quantitiesAccepted = 0;
  let falsePositiveSlots = 0;
  let visibleExact = 0;
  let reviewRequired = 0;
  let acceptedPairs = 0;
  let falseAcceptedPairs = 0;
  let iconReferences = 0;
  let iconCandidatesCorrect = 0;
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
    if (hit.slot.iconReferenceId) {
      iconReferences++;
      if ((cell.options ?? []).some((id) => String(id) === String(hit.slot.iconReferenceId)))
        iconCandidatesCorrect++;
    }
    const itemLabeled = hit.slot.itemId !== null && hit.slot.itemId !== undefined;
    const itemCorrect = itemLabeled && String(cell.item) === String(hit.slot.itemId);
    if (itemCorrect) itemsExact++;
    const text = String(cell.text ?? '').trim();
    const visible = /^(\d+)(?:[.,](\d+))?([kKmM])?$/.exec(text);
    const visibleValue = visible
      ? Math.round(
          Number(`${visible[1]}.${visible[2] ?? '0'}`) *
            (visible[3]?.toLowerCase() === 'k'
              ? 1000
              : visible[3]?.toLowerCase() === 'm'
                ? 1000000
                : 1),
        )
      : null;
    if (visibleValue !== null && String(visibleValue) === String(hit.slot.normalizedValue))
      visibleExact++;
    if (cell.uncertain || cell.itemUncertain || !cell.item || !cell.quantity) reviewRequired++;
    if (itemLabeled && !cell.itemUncertain && cell.item && !cell.uncertain && cell.quantity) {
      acceptedPairs++;
      if (!itemCorrect || String(cell.quantity) !== String(hit.slot.normalizedValue))
        falseAcceptedPairs++;
    }
    if (!cell.uncertain && cell.quantity) {
      quantitiesAccepted++;
      if (String(cell.quantity) === String(hit.slot.normalizedValue)) quantitiesExact++;
    }
  }
  return {
    sampleId: sample.id,
    expectedOccupiedSlots: expected.length,
    matchedSlots: matched.size,
    falsePositiveSlots: sample.quantityLabelsOnly ? null : falsePositiveSlots,
    unscoredSlots: sample.quantityLabelsOnly ? falsePositiveSlots : 0,
    itemTop1: {
      labeled: expectedItems,
      exact: itemsExact,
      accuracy: expectedItems ? itemsExact / expectedItems : null,
    },
    visibleQuantities: {
      exact: visibleExact,
      accuracy: expected.length ? visibleExact / expected.length : null,
    },
    review: { required: reviewRequired, rate: matched.size ? reviewRequired / matched.size : null },
    acceptedPairs: { total: acceptedPairs, incorrect: falseAcceptedPairs },
    iconCandidateCoverage: {
      labeled: iconReferences,
      found: iconCandidatesCorrect,
      accuracy: iconReferences ? iconCandidatesCorrect / iconReferences : null,
    },
    durationMs: output.durationMs ?? null,
    acceptedQuantities: {
      total: quantitiesAccepted,
      exact: quantitiesExact,
      accuracy: expected.length ? quantitiesExact / expected.length : null,
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
  report.split = sample.split ?? null;
  report.sessionId = sample.sessionId ?? null;
  report.readerComparison = Object.fromEntries(
    Object.entries(output.readers ?? {}).map(([name, reader]) => {
      const scored = scoreScanOutput(sample, reader);
      return [name, { ...scored.visibleQuantities, durationMs: reader.durationMs }];
    }),
  );
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
}
