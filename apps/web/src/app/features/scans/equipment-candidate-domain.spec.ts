import { describe, expect, it } from 'vitest';

import { isEquipmentCandidateForSlot } from './equipment-reading';
describe('equipment candidate domain', () => {
  it('rejects furniture and materials regardless of image similarity', () => {
    for (const category of ['housing', 'material', 'fish', null])
      expect(isEquipmentCandidateForSlot({ category }, 'armor')).toBe(false);
    expect(isEquipmentCandidateForSlot({ category: 'armor' }, 'helmet')).toBe(true);
    expect(isEquipmentCandidateForSlot({ category: 'mainweapon' }, 'mainhand')).toBe(true);
    expect(isEquipmentCandidateForSlot({ category: 'mainweapon' }, 'ring1')).toBe(false);
    expect(isEquipmentCandidateForSlot({ category: 'accessory' }, 'ring1')).toBe(true);
    expect(isEquipmentCandidateForSlot({ category: 'armor' }, '')).toBe(true);
    expect(isEquipmentCandidateForSlot({ category: 'housing' }, '')).toBe(false);
  });
});
