import { describe, expect, it } from 'vitest';

import { reconcileQuantity } from './quantity-reconciliation';
const reading = (value: string, confidence: number) => ({
  value,
  text: value,
  confidence,
  approximate: false,
});
describe('Independent quantity recognition', () => {
  it('keeps the numeric candidate empty when weak local evidence disagrees with OCR', () => {
    expect(reconcileQuantity(reading('12', 40), reading('72', 92))).toMatchObject({
      value: null,
      text: '72',
      confidence: 84,
      evidence: 'conflict',
    });
  });
  it('requires correction when two confident recognizers disagree', () => {
    expect(reconcileQuantity(reading('12', 90), reading('72', 92))).toMatchObject({
      value: null,
      text: '72',
      confidence: 84,
      evidence: 'conflict',
    });
  });
  it('does not accept a high confidence reading without corroboration', () => {
    expect(reconcileQuantity(null, reading('72', 99))).toMatchObject({
      confidence: 84,
      evidence: 'single',
    });
  });
  it('accepts agreement and preserves earlier conflicts for manual review', () => {
    expect(reconcileQuantity(reading('72', 90), reading('72', 95))).toMatchObject({
      confidence: 95,
      evidence: 'agreement',
    });
    const conflict = reconcileQuantity(reading('12', 90), reading('72', 95));
    expect(reconcileQuantity(conflict, reading('72', 99))).toMatchObject({
      value: null,
      confidence: 84,
      evidence: 'conflict',
    });
  });
  it('keeps exact local evidence if the fallback is unavailable', () => {
    expect(
      reconcileQuantity(reading('123', 90), {
        value: null,
        text: '',
        confidence: 0,
        approximate: false,
      }).value,
    ).toBe('123');
  });
});
