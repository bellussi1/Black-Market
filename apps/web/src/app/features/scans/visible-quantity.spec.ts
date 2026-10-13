import { describe, expect, it } from 'vitest';

import { mapQuantityLines } from './print-reader';
import { parseVisibleQuantity } from './visible-quantity';

describe('Visible game quantities', () => {
  it.each([
    ['264.8k', '264800'],
    ['264,8 K', '264800'],
    ['1.3M', '1300000'],
    ['455k', '455000'],
    ['1,25m', '1250000'],
  ])('keeps %s as an approximation', (text, value) => {
    expect(parseVisibleQuantity(text)).toMatchObject({ value, approximate: true });
  });
  it.each([
    ['1444K', '144.4K', '144400'],
    ['3905k', '390.5k', '390500'],
    ['3110K', '311.0K', '311000'],
  ])('restores a missing BDO decimal in %s', (text, normalized, value) => {
    expect(parseVisibleQuantity(text)).toEqual({ text: normalized, value, approximate: true });
  });
  it.each([
    ['23567', '23567'],
    ['23.567', '23567'],
    ['23,567', '23567'],
    ['277,478,534,789', '277478534789'],
    ['0', '0'],
  ])('parses exact quantity %s', (text, value) => {
    expect(parseVisibleQuantity(text)).toMatchObject({ value, approximate: false });
  });
  it.each([
    '',
    '1.2',
    '1,23',
    '129/192',
    '25oo',
    '-1',
    '2kk',
    '14994K',
    '1.234,5',
    '9007199254740992',
    '99999999999999M',
  ])('refuses incomplete or ambiguous %s', (text) => {
    expect(parseVisibleQuantity(text)).toBeNull();
  });
  it('does not shift readings into a blank slot, join fragments or use a line crossing cells', () => {
    const line = (text: string, y0: number, y1: number) => ({
      text,
      confidence: 88,
      bbox: { x0: 0, x1: 100, y0, y1 },
    });
    const result = mapQuantityLines(
      [
        line('23567', 12, 50),
        line('264.8k', 212, 250),
        line('12', 312, 330),
        line('34', 340, 350),
        line('99', 490, 520),
      ],
      6,
      100,
    );
    expect(result.map((entry) => entry.value)).toEqual(['23567', null, '264800', null, null, null]);
    expect(result[2].approximate).toBe(true);
  });
});
