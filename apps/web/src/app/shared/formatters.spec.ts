import { describe, expect, it } from 'vitest';
import { number, silver } from './formatters';

describe('formatters', () => {
  it('formats silver without losing integer precision', () => {
    expect(silver('1000000000000000001')).toBe('1.000.000.000.000.000.001');
  });
  it('uses a placeholder for absent or invalid prices', () => {
    expect(silver(null)).toBe('—');
    expect(silver('invalid')).toBe('—');
    expect(number(undefined)).toBe('—');
  });
});
