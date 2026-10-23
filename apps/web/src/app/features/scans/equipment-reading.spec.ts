import { describe, expect, it } from 'vitest';

import {
  confirmedEquipmentStatistics,
  emptyEquipmentStatistics,
  enhancementLevel,
  parseEnhancement,
} from './equipment-reading';
import { suggestEquipmentLayout } from './equipment-slots';

describe('Equipment screenshot interpretation', () => {
  it('keeps Roman rank distinct from stored weapon and accessory levels', () => {
    expect(enhancementLevel(parseEnhancement('VIII')!, 'armor')).toBe(23);
    expect(enhancementLevel(parseEnhancement('VIII')!, 'ring1')).toBe(8);
    expect(enhancementLevel(parseEnhancement('X')!, 'mainhand')).toBe(25);
    expect(enhancementLevel(parseEnhancement('+15')!, 'gloves')).toBe(15);
    expect(enhancementLevel(parseEnhancement('+15')!, 'necklace')).toBeNull();
    expect(enhancementLevel(parseEnhancement('V')!, '')).toBeNull();
    expect(enhancementLevel(parseEnhancement('V')!, 'clothes')).toBeNull();
  });
  it('refuses absent, ambiguous, malformed and numerical quantity labels', () => {
    for (const label of ['', '0', '8', 'VI II', 'IIII', 'V1', 'XI', '+16', '417', 'VIII IX'])
      expect(parseEnhancement(label)).toBeNull();
  });
  it('preserves blank attributes and validates only explicitly filled fields', () => {
    expect(confirmedEquipmentStatistics(emptyEquipmentStatistics())).toEqual({});
    expect(confirmedEquipmentStatistics({ mainAp: '417', awakeAp: '417', dp: '505' })).toEqual({
      mainAp: 417,
      awakeAp: 417,
      dp: 505,
    });
    expect(confirmedEquipmentStatistics({ mainAp: '', awakeAp: '0', dp: '' })).toEqual({
      awakeAp: 0,
    });
    for (const value of ['-1', '5.5', 'NaN', '5001', 'Infinity', '1e3'])
      expect(() => confirmedEquipmentStatistics({ mainAp: value, awakeAp: '', dp: '' })).toThrow(
        'Confira',
      );
  });
  const combat = [
    [0, 0],
    [3, 0],
    [-1.2, 1.1],
    [4.2, 1.1],
    [-2, 2.45],
    [5, 2.45],
    [-2, 5.1],
    [5, 5.1],
    [-1.2, 6.3],
    [4.2, 6.3],
    [0, 7.3],
    [1.5, 7.6],
    [3, 7.3],
  ];
  it('recognizes a translated/scaled combat constellation while leaving interior costumes unassigned', () => {
    const frames = [...combat, [0.3, 1.8], [2.7, 1.8]].map(([x, y]) => ({
      left: 200 + x * 48,
      top: 100 + y * 48,
      width: 48,
      height: 48,
    }));
    const layout = suggestEquipmentLayout(frames, { left: 0, top: 0, width: 800, height: 850 });
    expect(layout.slots.size).toBe(13);
    expect(layout.slots.get(0)).toBe('helmet');
    expect(layout.slots.get(12)).toBe('offhand');
    expect(layout.slots.has(13)).toBe(false);
    expect(layout.statistics.map((row) => row.field)).toEqual(['mainAp', 'awakeAp', 'dp']);
  });
  it('does not guess slots from a lone item, inventory grid or truncated constellation', () => {
    const frames = combat
      .slice(0, 5)
      .map(([x, y]) => ({ left: 100 + x * 34, top: 50 + y * 34, width: 34, height: 34 }));
    expect(
      suggestEquipmentLayout(frames, { left: 0, top: 0, width: 500, height: 500 }).slots.size,
    ).toBe(0);
    const grid = Array.from({ length: 24 }, (_, i) => ({
      left: (i % 4) * 40,
      top: Math.floor(i / 4) * 40,
      width: 34,
      height: 34,
    }));
    expect(
      suggestEquipmentLayout(grid, { left: 0, top: 0, width: 500, height: 500 }).slots.size,
    ).toBe(0);
  });
});
