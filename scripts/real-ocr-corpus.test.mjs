import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleValue } from './build-real-slot-corpus.mjs';
import { validateRealSamples } from './real-ocr-corpus.mjs';

const sample = {
  source: 'user-provided',
  sessionId: 'session-a',
  sha256: 'hash-a',
  split: 'calibration',
  width: 60,
  height: 60,
  slots: [
    {
      bounds: { left: 0, top: 0, width: 56, height: 56 },
      displayedText: '139.1k',
      normalizedValue: '139100',
    },
  ],
};
test('normalizes visible integer and decimal suffixes without inventing hidden stack precision', () => {
  for (const [text, value] of [
    ['1', '1'],
    ['139.1k', '139100'],
    ['319,9K', '319900'],
    ['1.3M', '1300000'],
  ])
    assert.equal(visibleValue(text), value);
  assert.throws(() => visibleValue(''));
  assert.throws(() => visibleValue('O12'));
});
test('rejects session leakage even when different images are used', () => {
  assert.throws(
    () => validateRealSamples([sample, { ...sample, sha256: 'other', split: 'evaluation' }]),
    /crosses splits/,
  );
});
test('rejects duplicate source images across splits with different session names', () => {
  assert.throws(
    () => validateRealSamples([sample, { ...sample, sessionId: 'session-b', split: 'evaluation' }]),
    /crosses splits/,
  );
});
test('accepts independent sessions and rejects cropped labels outside image bounds', () => {
  validateRealSamples([
    sample,
    { ...sample, sessionId: 'session-b', sha256: 'other', split: 'evaluation' },
  ]);
  assert.throws(() => validateRealSamples([{ ...sample, width: 20 }]), /outside capture/);
});
