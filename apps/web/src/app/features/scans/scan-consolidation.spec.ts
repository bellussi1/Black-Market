import { describe, expect, it } from 'vitest';

import {
  consolidateOccurrences,
  imageHashDistance,
  occurrenceKey,
  type ReviewedOccurrence,
  stockMatches,
} from './scan-consolidation';
const row = (changes: Partial<ReviewedOccurrence> = {}): ReviewedOccurrence => ({
  itemId: 6201,
  name: 'Item',
  quantity: 100,
  location: 'Velia',
  kind: 'storage',
  source: { hash: 'a'.repeat(64), slot: 0, capture: 1 },
  ...changes,
});
describe('Screenshot consolidation', () => {
  it('blocks unresolved duplicates including partially overlapping captures', () => {
    expect(() =>
      consolidateOccurrences(
        [row(), row({ source: { hash: 'b'.repeat(64), slot: 8, capture: 2 } })],
        {},
      ),
    ).toThrow('repetido');
  });
  it('uses explicit absolute quantities instead of adding repeated observations', () => {
    const rows = [row(), row({ quantity: 80 })],
      key = occurrenceKey(rows[0]);
    expect(consolidateOccurrences(rows, { [key]: 'latest' })[0].quantity).toBe(80);
    expect(consolidateOccurrences(rows, { [key]: 'maximum' })[0].quantity).toBe(100);
  });
  it('counts the same screenshot slot only once even if distinct stacks are selected', () => {
    const rows = [row(), row(), row({ source: { hash: 'b'.repeat(64), slot: 8, capture: 2 } })],
      key = occurrenceKey(rows[0]);
    const result = consolidateOccurrences(rows, { [key]: 'distinct-stacks' });
    expect(result[0].quantity).toBe(200);
    expect(result[0].sources).toHaveLength(2);
  });
  it('keeps different cities, character identities and item IDs separate', () => {
    expect(
      consolidateOccurrences(
        [
          row(),
          row({ location: 'Heidel' }),
          row({ kind: 'inventory', characterId: 'one' }),
          row({ kind: 'inventory', characterId: 'two' }),
          row({ itemId: 6202 }),
        ],
        {},
      ),
    ).toHaveLength(5);
  });
  it('normalizes destination case and rejects unsafe or overflowing quantities', () => {
    expect(occurrenceKey(row())).toBe(occurrenceKey(row({ location: ' velia ' })));
    expect(() => consolidateOccurrences([row({ quantity: 1.5 })], {})).toThrow();
    expect(() =>
      consolidateOccurrences(
        [row({ quantity: 1e9 }), row({ source: { hash: 'b'.repeat(64), slot: 1, capture: 2 } })],
        { [occurrenceKey(row())]: 'distinct-stacks' },
      ),
    ).toThrow('limite');
  });
  it('matches legacy storage and avoids merging with character inventory', () => {
    expect(stockMatches({ itemId: 6201, location: 'VELIA' }, row())).toBe(true);
    expect(
      stockMatches(
        { itemId: 6201, location: 'Velia', kind: 'inventory', characterId: 'one' },
        row(),
      ),
    ).toBe(false);
  });
  it('treats near image hashes as a warning signal rather than item identity', () => {
    expect(imageHashDistance('0'.repeat(64), '0'.repeat(63) + '1')).toBe(1);
    expect(imageHashDistance('bad', 'bad')).toBe(64);
  });
  it('preserves distinct panes of the same screenshot using crop coordinates', () => {
    const rows = [
      row({ source: { hash: 'a'.repeat(64), slot: 0, capture: 1, position: '1,1,48,48' } }),
      row({ source: { hash: 'a'.repeat(64), slot: 0, capture: 2, position: '501,1,48,48' } }),
    ];
    expect(
      consolidateOccurrences(rows, { [occurrenceKey(rows[0])]: 'distinct-stacks' })[0].quantity,
    ).toBe(200);
  });
});
