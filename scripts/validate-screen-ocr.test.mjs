import assert from 'node:assert/strict';
import { test } from 'node:test';

import { selectCapturesForSplit } from './validate-screen-ocr.mjs';

const captures = [
  { id: 'calibration-1', split: 'calibration' },
  { id: 'evaluation-1', split: 'evaluation' },
  { id: 'calibration-2', split: 'calibration' },
];

test('selects only captures from the requested OCR evaluation split', () => {
  assert.deepEqual(
    selectCapturesForSplit(captures, 'evaluation').map((capture) => capture.id),
    ['evaluation-1'],
  );
});

test('refuses an empty OCR split instead of reporting a misleading zero score', () => {
  assert.throws(
    () =>
      selectCapturesForSplit(
        captures.filter((capture) => capture.split === 'calibration'),
        'evaluation',
      ),
    /Nenhuma captura/,
  );
});
