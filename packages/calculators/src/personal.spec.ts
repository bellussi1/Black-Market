import { describe, expect, it } from 'vitest';

import {
  availableInventory,
  characterSchema,
  familyProfileSchema,
  gearSlots,
  lifeSkills,
  personalPlanSchema,
  reservationIssues,
} from './personal';
import { emptyWorkspace, workspaceSchema } from './workspace';
describe('Personal planning', () => {
  const emptyLifeEquipment = () => ({
    sharedItems: [],
    bySkill: Object.fromEntries(lifeSkills.map((skill) => [skill, []])),
  });
  const lifeItem = (overrides: Record<string, unknown> = {}) => ({
    id: 'life-item-1',
    catalogItemId: 16479,
    name: 'Enxada Manos',
    kind: 'tool',
    ...overrides,
  });
  const familyWithLifeEquipment = (lifeEquipment: unknown) =>
    familyProfileSchema.safeParse({ lifeEquipment });

  it('defaults old family profiles to empty life equipment for all skills', () => {
    const family = familyProfileSchema.parse({ name: 'Família antiga' });
    expect(family.lifeEquipment?.sharedItems).toEqual([]);
    expect(Object.keys(family.lifeEquipment?.bySkill ?? {})).toEqual([...lifeSkills]);
    expect(family.lifeEquipment?.bySkill.gathering).toEqual([]);
    expect(family.lifeEquipment?.bySkill.barter).toEqual([]);
  });

  it('validates a complete old workspace without changing version or character equipment', () => {
    const gear = [
      { slot: 'mainhand' as const, itemId: 1, name: 'Arma antiga', level: 7, caphras: 2 },
    ];
    const character = characterSchema.parse({
      id: 'main',
      name: 'Personagem antigo',
      region: 'sa',
      gear,
      activityPresets: [{ id: 'p', name: 'Coleta', gear, crystals: [] }],
    });
    const oldWorkspace = {
      ...emptyWorkspace(),
      characters: [character],
      families: { sa: { name: 'Família antiga' } },
    };

    const restored = workspaceSchema.parse(oldWorkspace);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.characters[0]).toEqual(character);
    expect(restored.characters[0]?.gear).toEqual(gear);
    expect(restored.characters[0]?.activityPresets?.[0]?.gear).toEqual(gear);
    expect(restored.families?.sa?.lifeEquipment?.bySkill.gathering).toEqual([]);
  });

  it('accepts life equipment screenshot import provenance without changing the workspace version', () => {
    const parsed = workspaceSchema.safeParse({
      ...emptyWorkspace(),
      screenshotImports: [
        {
          id: 'life-import',
          region: 'sa',
          createdAt: '2026-10-23T12:00:00.000Z',
          mode: 'life-gear',
          itemCount: 1,
          locations: ['Família'],
          sourceHashes: ['a'.repeat(64)],
        },
        {
          id: 'mixed-import',
          region: 'sa',
          createdAt: '2026-10-23T12:01:00.000Z',
          mode: 'mixed',
          itemCount: 2,
          locations: ['Velia', 'Família'],
          sourceHashes: ['b'.repeat(64)],
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.schemaVersion).toBe(1);
  });

  it('accepts only the three shared life equipment kinds and defaults missing enhancement to null', () => {
    for (const kind of ['accessory', 'alchemyStone', 'purityOrb']) {
      const parsed = familyWithLifeEquipment({
        ...emptyLifeEquipment(),
        sharedItems: [lifeItem({ kind })],
      });
      expect(parsed.success).toBe(true);
      expect(Reflect.get(parsed.data, 'lifeEquipment')).toMatchObject({ sharedItems: [{ kind }] });
    }

    const parsed = familyWithLifeEquipment({
      ...emptyLifeEquipment(),
      bySkill: { ...emptyLifeEquipment().bySkill, gathering: [lifeItem()] },
    });
    expect(Reflect.get(parsed.data, 'lifeEquipment')).toMatchObject({
      bySkill: {
        gathering: [
          {
            id: 'life-item-1',
            catalogItemId: 16479,
            name: 'Enxada Manos',
            kind: 'tool',
            enhancementText: null,
          },
        ],
      },
    });
  });

  it('rejects non-shareable kinds and more than fifty items in any list', () => {
    expect(
      familyWithLifeEquipment({
        ...emptyLifeEquipment(),
        sharedItems: [lifeItem({ kind: 'tool' })],
      }).success,
    ).toBe(false);

    const tooMany = Array.from({ length: 51 }, (_, index) =>
      lifeItem({ id: `item-${index}`, catalogItemId: index + 1 }),
    );
    expect(familyWithLifeEquipment({ ...emptyLifeEquipment(), sharedItems: tooMany }).success).toBe(
      false,
    );
    expect(
      familyWithLifeEquipment({
        ...emptyLifeEquipment(),
        bySkill: { ...emptyLifeEquipment().bySkill, gathering: tooMany },
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate internal IDs and duplicate catalogue items across shared and skill lists', () => {
    const duplicateId = familyWithLifeEquipment({
      ...emptyLifeEquipment(),
      bySkill: {
        ...emptyLifeEquipment().bySkill,
        gathering: [lifeItem(), lifeItem({ catalogItemId: 42 })],
      },
    });
    expect(duplicateId.success).toBe(false);

    const duplicateCatalogueItem = familyWithLifeEquipment({
      ...emptyLifeEquipment(),
      sharedItems: [lifeItem({ kind: 'accessory' })],
      bySkill: { ...emptyLifeEquipment().bySkill, gathering: [lifeItem({ id: 'skill-copy' })] },
    });
    expect(duplicateCatalogueItem.success).toBe(false);
  });

  it('allows the same catalogue item in different life skills', () => {
    const parsed = familyWithLifeEquipment({
      ...emptyLifeEquipment(),
      bySkill: {
        ...emptyLifeEquipment().bySkill,
        gathering: [lifeItem()],
        cooking: [lifeItem({ id: 'cooking-copy' })],
      },
    });
    expect(parsed.success).toBe(true);
  });

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
