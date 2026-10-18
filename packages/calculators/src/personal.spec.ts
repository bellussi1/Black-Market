import { describe, expect, it } from 'vitest';

import {
  availableInventory,
  characterSchema,
  gearSlots,
  personalPlanSchema,
  reservationIssues,
} from './personal';
import { emptyWorkspace, workspaceSchema } from './workspace';
describe('Personal planning', () => {
  it('supports alchemy stone and adventurer tome without discarding existing gear or presets', () => {
    const gear = [...gearSlots, 'alchemyStone', 'tome']
      .filter((slot, index, all) => all.indexOf(slot) === index)
      .map((slot, index) => ({ slot, itemId: index + 1, name: slot, level: 0, caphras: 0 }));
    const profile = characterSchema.parse({
      id: 'life',
      name: 'Profissão',
      region: 'sa',
      gear,
      activityPresets: [{ id: 'p', name: 'Coleta', gear, crystals: [] }],
    });
    expect(profile.gear).toHaveLength(17);
    expect(profile.activityPresets?.[0].gear).toHaveLength(17);
    expect(profile.gear.find((row) => row.slot === 'tool')).toBeDefined();
    expect(characterSchema.parse({ id: 'old', name: 'Antigo', region: 'sa' }).gear).toEqual([]);
  });
  const plan = (id: string, quantity: number) =>
    personalPlanSchema.parse({
      id,
      name: 'Plano',
      region: 'sa',
      createdAt: '2026-10-08T00:00:00Z',
      status: 'reserved',
      materials: [{ itemId: 1, name: 'Material', quantity }],
    });
  const inventory = [
    { region: 'sa', itemId: 1, name: 'Material', location: 'Velia', quantity: 10 },
  ];
  it('does not reserve the same units twice', () => {
    expect(reservationIssues([plan('a', 6), plan('b', 6)], inventory)).toHaveLength(1);
    expect(availableInventory([plan('a', 6)], inventory)[0].quantity).toBe(4);
    expect(inventory[0].quantity).toBe(10);
  });
  it('keeps markets separated', () => {
    const other = { ...plan('a', 6), region: 'eu' };
    expect(availableInventory([other], inventory)[0].quantity).toBe(10);
  });
  it('rejects duplicate equipment slots', () => {
    expect(
      characterSchema.safeParse({
        id: 'a',
        name: 'Personagem',
        region: 'sa',
        gear: [
          { slot: 'armor', itemId: 1, name: 'Armadura' },
          { slot: 'armor', itemId: 2, name: 'Outra' },
        ],
      }).success,
    ).toBe(false);
  });
  it('accepts existing backups without the new fields', () => {
    const old: Record<string, unknown> = { ...emptyWorkspace() };
    delete old['characters'];
    delete old['personalPlans'];
    delete old['activityCoach'];
    const restored = workspaceSchema.parse(old);
    expect(restored.characters).toEqual([]);
    expect(restored.activityCoach.preferredSkills).toEqual(['cooking', 'alchemy', 'processing']);
    expect(restored.activityCoach.calibrations).toEqual([]);
  });
  it('validates persisted activity preferences and positive per-character calibrations', () => {
    const workspace = emptyWorkspace();
    workspace.activityCoach = {
      preferredSkills: ['alchemy'],
      calibrations: [
        {
          characterId: 'main',
          method: 'ALCHEMY',
          seconds: 4.5,
          updatedAt: '2026-10-15T12:00:00.000Z',
        },
      ],
    };
    expect(workspaceSchema.parse(workspace).activityCoach).toEqual(workspace.activityCoach);
    expect(
      workspaceSchema.safeParse({
        ...workspace,
        activityCoach: {
          ...workspace.activityCoach,
          calibrations: [{ ...workspace.activityCoach.calibrations[0]!, seconds: 0 }],
        },
      }).success,
    ).toBe(false);
  });
});
