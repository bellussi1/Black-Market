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
