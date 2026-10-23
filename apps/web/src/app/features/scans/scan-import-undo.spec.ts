import { characterSchema, familyProfileSchema, personalPlanSchema } from '@bdo/calculators';
import { describe, expect, it } from 'vitest';

import { emptyWorkspace, type Workspace } from '../../core/workspace-models';
import { createScanImportUndo, undoScanImport } from './scan-import-undo';

const row = (id: string, quantity = 10, itemId = 212): Workspace['inventory'][number] => ({
  id,
  region: 'sa',
  itemId,
  name: `Item ${itemId}`,
  location: 'Velia',
  quantity,
  target: 0,
  price: '20',
});
const imported = (before: Workspace, inventory = [row('new')]): Workspace => ({
  ...before,
  inventory,
  screenshotImports: [
    {
      id: 'import',
      region: 'sa',
      createdAt: '2026-10-16T00:00:00Z',
      mode: 'reviewed',
      itemCount: 1,
      locations: ['Velia'],
      sourceHashes: ['a'.repeat(64)],
    },
  ],
});

describe('Safe screenshot import undo', () => {
  it('reverses added, updated and removed stock together with import history', () => {
    const before = { ...emptyWorkspace(), inventory: [row('edited', 2), row('removed', 3, 213)] };
    const after = imported(before, [row('edited', 8), row('created', 4, 214)]);
    const undo = createScanImportUndo(before, after);
    expect(undoScanImport(after, undo)).toEqual(before);
    expect(after.inventory[0].quantity).toBe(8);
  });
  it('preserves later changes outside the imported stock identities and fields', () => {
    const before = emptyWorkspace();
    const after = imported(before);
    const current = {
      ...after,
      familySilver: '123',
      inventory: [...after.inventory, row('elsewhere', 9, 999)],
    };
    const restored = undoScanImport(current, createScanImportUndo(before, after));
    expect(restored.familySilver).toBe('123');
    expect(restored.inventory).toEqual([row('elsewhere', 9, 999)]);
  });
  it('restores only imported family life equipment and preserves later family edits', () => {
    const originalFamily = familyProfileSchema.parse({ name: 'Família original' });
    const otherFamily = familyProfileSchema.parse({ name: 'Família EU' });
    const before = {
      ...emptyWorkspace(),
      families: { sa: originalFamily, eu: otherFamily },
    };
    const after = imported(before);
    const item = {
      id: 'life-item',
      catalogItemId: 16479,
      name: 'Enxada Manos',
      kind: 'tool' as const,
      enhancementText: null,
    };
    after.families = {
      ...before.families,
      sa: {
        ...originalFamily,
        lifeEquipment: {
          ...originalFamily.lifeEquipment,
          bySkill: { ...originalFamily.lifeEquipment.bySkill, gathering: [item] },
        },
      },
    };
    const current = {
      ...after,
      familySilver: '123',
      families: {
        ...after.families,
        sa: { ...after.families.sa!, name: 'Família renomeada depois' },
        eu: { ...otherFamily, name: 'Família EU atualizada depois' },
      },
    };

    const restored = undoScanImport(current, createScanImportUndo(before, after));

    expect(restored.families?.sa).toMatchObject({
      name: 'Família renomeada depois',
      lifeEquipment: { sharedItems: [], bySkill: { gathering: [] } },
    });
    expect(restored.families?.eu?.name).toBe('Família EU atualizada depois');
    expect(restored.familySilver).toBe('123');
  });
  it('removes the family profile created solely by the first life equipment import', () => {
    const before = emptyWorkspace();
    const after = imported(before);
    const emptyFamily = familyProfileSchema.parse({});
    const item = {
      id: 'life-item',
      catalogItemId: 16479,
      name: 'Enxada Manos',
      kind: 'tool' as const,
      enhancementText: null,
    };
    after.families = {
      sa: {
        ...emptyFamily,
        lifeEquipment: {
          ...emptyFamily.lifeEquipment,
          bySkill: { ...emptyFamily.lifeEquipment.bySkill, gathering: [item] },
        },
      },
    };

    expect(undoScanImport(after, createScanImportUndo(before, after)).families).toBeUndefined();
  });
  it('rejects undo when imported family life equipment changed afterward', () => {
    const originalFamily = familyProfileSchema.parse({ name: 'Família' });
    const before = { ...emptyWorkspace(), families: { sa: originalFamily } };
    const after = imported(before);
    after.families = {
      ...before.families,
      sa: {
        ...originalFamily,
        lifeEquipment: {
          ...originalFamily.lifeEquipment,
          sharedItems: [
            {
              id: 'shared-life-item',
              catalogItemId: 500,
              name: 'Acessório',
              kind: 'accessory',
              enhancementText: null,
            },
          ],
        },
      },
    };
    const current = {
      ...after,
      families: {
        ...after.families,
        sa: {
          ...after.families.sa!,
          lifeEquipment: { ...after.families.sa!.lifeEquipment, sharedItems: [] },
        },
      },
    };

    expect(() => undoScanImport(current, createScanImportUndo(before, after))).toThrow(/alterad/i);
  });
  it('rejects later changes to an imported quantity without mutating current state', () => {
    const before = emptyWorkspace();
    const after = imported(before);
    const current = { ...after, inventory: [row('new', 11)] };
    expect(() => undoScanImport(current, createScanImportUndo(before, after))).toThrow(/alterad/i);
    expect(current.inventory[0].quantity).toBe(11);
  });
  it('rejects another ID added for the same stock identity before restoring a removed row', () => {
    const before = { ...emptyWorkspace(), inventory: [row('removed')] };
    const after = imported(before, []);
    const current = { ...after, inventory: [row('different-id')] };
    expect(() => undoScanImport(current, createScanImportUndo(before, after))).toThrow(/alterad/i);
  });
  it('keeps the same item from another region or character separate', () => {
    const before = emptyWorkspace(),
      after = imported(before);
    const foreign = { ...row('eu'), region: 'eu' as const };
    expect(
      undoScanImport(
        { ...after, inventory: [...after.inventory, foreign] },
        createScanImportUndo(before, after),
      ).inventory,
    ).toEqual([foreign]);
  });
  it('restores gear and confirmed attributes while preserving a later character rename', () => {
    const profile = characterSchema.parse({
      id: 'hero',
      name: 'Original',
      region: 'sa',
      mainAp: 100,
    });
    const before = { ...emptyWorkspace(), characters: [profile] };
    const after = {
      ...imported(before),
      characters: [
        {
          ...profile,
          mainAp: 200,
          gear: [
            {
              slot: 'armor' as const,
              itemId: 1,
              name: 'Armor',
              level: 0,
              caphras: 0,
              levelConfirmed: false,
              caphrasConfirmed: false,
            },
          ],
        },
      ],
    };
    const current = { ...after, characters: [{ ...after.characters[0], name: 'Renamed' }] };
    const restored = undoScanImport(current, createScanImportUndo(before, after));
    expect(restored.characters[0]).toMatchObject({ name: 'Renamed', mainAp: 100, gear: [] });
  });
  it('rejects subsequent changes to imported character fields', () => {
    const profile = characterSchema.parse({ id: 'hero', name: 'Hero', region: 'sa', mainAp: 100 });
    const before = { ...emptyWorkspace(), characters: [profile] };
    const after = { ...imported(before), characters: [{ ...profile, mainAp: 200 }] };
    const current = { ...after, characters: [{ ...after.characters[0], mainAp: 201 }] };
    expect(() => undoScanImport(current, createScanImportUndo(before, after))).toThrow(/alterad/i);
  });
  it('rejects undo after a later import or switching between demonstration and personal data', () => {
    const before = emptyWorkspace(),
      after = imported(before),
      token = createScanImportUndo(before, after);
    expect(() => undoScanImport({ ...after, screenshotImports: [] }, token)).toThrow(/importa/i);
    expect(() =>
      undoScanImport(
        { ...after, demonstration: { version: 'brazil-v1', label: 'Demonstração' } },
        token,
      ),
    ).toThrow(/contexto/i);
    expect(() => undoScanImport({ ...after, region: 'eu' }, token)).toThrow(/região/i);
  });
  it('refuses a restoration that would invalidate a later stock reservation', () => {
    const before = emptyWorkspace(),
      after = imported(before);
    const current = {
      ...after,
      personalPlans: [
        personalPlanSchema.parse({
          id: 'plan',
          name: 'Plan',
          region: 'sa',
          createdAt: '2026-10-16T00:00:00Z',
          status: 'reserved',
          materials: [{ itemId: 212, name: 'Item', quantity: 5 }],
        }),
      ],
    };
    expect(() => undoScanImport(current, createScanImportUndo(before, after))).toThrow(/reserva/i);
    expect(current.inventory[0].quantity).toBe(10);
  });
  it('captures independent snapshots so later array mutations cannot change the undo token', () => {
    const before = { ...emptyWorkspace(), inventory: [row('existing', 2)] };
    const after = imported(before, [row('existing', 8)]);
    const token = createScanImportUndo(before, after);
    before.inventory[0].quantity = 99;
    expect(undoScanImport(after, token).inventory[0].quantity).toBe(2);
  });
  it('restores an evicted history entry when the sixty-entry import history was full', () => {
    const before = emptyWorkspace();
    before.screenshotImports = Array.from({ length: 60 }, (_, index) => ({
      ...imported(before).screenshotImports[0],
      id: `history-${index}`,
    }));
    const after = imported(before);
    after.screenshotImports = [...before.screenshotImports.slice(1), ...after.screenshotImports];
    expect(undoScanImport(after, createScanImportUndo(before, after)).screenshotImports).toEqual(
      before.screenshotImports,
    );
  });
});
