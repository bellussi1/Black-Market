import { describe, expect, it } from 'vitest';

import { normalizeArsha } from './arsha-provider';
const item = {
  id: 1,
  sid: 0,
  name: 'Test item',
  basePrice: '9007199254740993',
  currentStock: 2,
  totalTrades: '100',
  lastSoldTime: 0,
};
describe('Arsha adapter', () => {
  it('preserves integer prices supplied as strings and distinguishes variants', () => {
    const rows = normalizeArsha([item, { ...item, sid: 5 }], 1);
    expect(rows[0].price).toBe('9007199254740993');
    expect(rows[1].subId).toBe(5);
  });
  it('marks zero base price as unavailable and rejects mismatched IDs', () => {
    expect(normalizeArsha({ ...item, basePrice: 0 }, 1)[0].price).toBeNull();
    expect(() => normalizeArsha(item, 2)).toThrow();
  });
  it('rejects unsafe numbers and malformed upstream payloads', () => {
    expect(() => normalizeArsha({ ...item, basePrice: 9007199254740992 }, 1)).toThrow();
    expect(() => normalizeArsha({ message: 'error' }, 1)).toThrow();
  });
});
