import { describe, expect, it } from 'vitest';

import { reconcileQuantity } from './quantity-reconciliation';
const reading = (value: string, confidence: number) => ({
  value,
  text: value,
  confidence,
  approximate: false,
});
describe('Independent quantity recognition', () => {
  it('replaces weak local recognition with a stronger exact reading', () => {
    expect(reconcileQuantity(reading('12', 40), reading('72', 92)).value).toBe('72');
  });
  it('requires correction when two confident recognizers disagree', () => {
    expect(reconcileQuantity(reading('12', 90), reading('72', 92)).value).toBeNull();
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
