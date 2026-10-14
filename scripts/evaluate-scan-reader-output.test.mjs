import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreScanOutput } from './evaluate-scan-reader-output.mjs';

test('scores actual matched output and rejects uncertain quantity suggestions', () => {
  const bounds = { left: 0, top: 0, width: 50, height: 50 };
  const sample = { id: 'sample', slots: [{ bounds, itemId: '42', normalizedValue: 1 }] };
  const uncertain = scoreScanOutput(sample, {
    cells: [{ rect: bounds, item: 42, quantity: '1', uncertain: true }],
  });
  assert.equal(uncertain.itemTop1.accuracy, 1);
  assert.equal(uncertain.acceptedQuantities.total, 0);
  const exact = scoreScanOutput(sample, {
    cells: [{ rect: bounds, item: 42, quantity: '1', uncertain: false }],
  });
  assert.equal(exact.acceptedQuantities.precision, 1);
});

test('separates visible abbreviations, automatic errors and unlabeled items', () => {
  const bounds = { left: 0, top: 0, width: 40, height: 40 };
  const sample = { id: 'real', slots: [{ bounds, itemId: null, normalizedValue: '139100' }] };
  const result = scoreScanOutput(sample, {
    durationMs: 25,
    cells: [
      {
        rect: bounds,
        item: null,
        text: '139,1K',
        quantity: '1391',
        uncertain: false,
        itemUncertain: true,
      },
    ],
  });
  assert.equal(result.itemTop1.accuracy, null);
  assert.equal(result.visibleQuantities.exact, 1);
  assert.equal(result.acceptedQuantities.precision, 0);
  assert.equal(result.review.rate, 1);
  assert.equal(result.durationMs, 25);
});

test('reports a wrong automatically accepted pair and does not divide by zero', () => {
  const bounds = { left: 0, top: 0, width: 40, height: 40 };
  const sample = { id: 'real', slots: [{ bounds, itemId: 42, normalizedValue: '25' }] };
  const result = scoreScanOutput(sample, {
    cells: [
      {
        rect: bounds,
        item: 43,
        quantity: '25',
        uncertain: false,
        itemUncertain: false,
      },
    ],
  });
  assert.equal(result.acceptedPairs.incorrect, 1);
  assert.equal(
    scoreScanOutput({ id: 'empty', slots: [] }, { cells: [] }).acceptedQuantities.accuracy,
    null,
  );
});

test('does not count unlabeled inventory slots as false detections', () => {
  const bounds = { left: 0, top: 0, width: 40, height: 40 };
  const result = scoreScanOutput(
    {
      id: 'partial',
      quantityLabelsOnly: true,
      slots: [{ bounds, itemId: null, normalizedValue: '19' }],
    },
    {
      cells: [
        { rect: bounds, text: '19', quantity: '', uncertain: true },
        { rect: { ...bounds, left: 80 }, text: '', quantity: '', uncertain: true },
      ],
    },
  );
  assert.equal(result.matchedSlots, 1);
  assert.equal(result.falsePositiveSlots, null);
  assert.equal(result.unscoredSlots, 1);
});
