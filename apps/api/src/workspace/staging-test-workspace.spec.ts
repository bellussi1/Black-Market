import { emptyWorkspace } from '@bdo/calculators/workspace';
import type { CatalogItem, CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { buildStagingTestWorkspace, mergeStagingTestWorkspace } from './staging-test-workspace';

const recipeFixture: { group: 'cooking' | 'alchemy' | 'processing'; recipe: CatalogRecipe }[] = [
  {
    group: 'cooking',
    recipe: {
      key: 'c'.repeat(64),
      type: 'COOK',
      station: 'Utensílio de Culinária',
      inputs: [
        { itemId: 1001, name: 'Ingrediente de Culinária', quantity: '3.0000' },
        { itemId: 1002, name: 'Água Mineral', quantity: '2.0000' },
      ],
      outputs: [{ itemId: 2001, name: 'Prato de Teste', quantity: '2.0000' }],
    },
  },
  {
    group: 'cooking',
    recipe: {
      key: 'd'.repeat(64),
      type: 'COOK',
      station: 'Utensílio de Culinária',
      inputs: [{ itemId: 1005, name: 'Carne de Teste', quantity: '2.0000' }],
      outputs: [{ itemId: 2004, name: 'Ensopado de Teste', quantity: '1.0000' }],
    },
  },
  {
    group: 'alchemy',
    recipe: {
      key: 'a'.repeat(64),
      type: 'ALCHEMY',
      station: 'Ferramenta de Alquimia',
      inputs: [{ itemId: 1003, name: 'Reagente de Alquimia', quantity: '1.0000' }],
      outputs: [{ itemId: 2002, name: 'Elixir de Teste', quantity: null }],
    },
  },
  {
    group: 'alchemy',
    recipe: {
      key: 'b'.repeat(64),
      type: 'SIMPLE_ALCHEMY',
      station: 'Ferramenta de Alquimia',
      inputs: [{ itemId: 1006, name: 'Folha de Teste', quantity: '3.0000' }],
      outputs: [{ itemId: 2005, name: 'Poção de Teste', quantity: '2.0000' }],
    },
  },
  {
    group: 'processing',
    recipe: {
      key: 'p'.repeat(64),
      type: 'GRIND',
      station: null,
      inputs: [{ itemId: 1004, name: 'Minério de Teste', quantity: '5.0000' }],
      outputs: [{ itemId: 2003, name: 'Lingote de Teste', quantity: '2.0000' }],
    },
  },
  {
    group: 'processing',
    recipe: {
      key: 'q'.repeat(64),
      type: 'DRY',
      station: null,
      inputs: [{ itemId: 1007, name: 'Peixe de Teste', quantity: '1.0000' }],
      outputs: [{ itemId: 2006, name: 'Peixe Seco de Teste', quantity: '1.0000' }],
    },
  },
];

function item(id: number, name: string, category: string): CatalogItem {
  return {
    id,
    name,
    description: null,
    grade: null,
    weight: null,
    category,
    icon: null,
    categories: [],
  };
}

const gearItems: Partial<Record<string, CatalogItem>> = {
  mainhand: item(3001, 'Arma de Teste', 'MainWeapon'),
  offhand: item(3002, 'Arma Secundária de Teste', 'SubWeapon'),
  armor: item(3003, 'Armadura de Teste', 'Armor'),
  ring1: item(3004, 'Acessório de Teste', 'Accessory'),
  tool: item(3005, 'Ferramenta de Teste', 'Tool'),
};

describe('staging test workspace fixture', () => {
  it('builds catalog-backed records for the requested testing surfaces', () => {
    const fixture = buildStagingTestWorkspace(
      recipeFixture,
      gearItems,
      new Date('2026-10-14T12:00:00.000Z'),
    );

    expect(fixture.characters).toHaveLength(3);
    expect(fixture.characters[0]?.id).toBe('staging-test-main');
    expect(fixture.characters[0]?.gear).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slot: 'mainhand', itemId: 3001, name: 'Arma de Teste' }),
        expect.objectContaining({ slot: 'offhand', itemId: 3002 }),
      ]),
    );
    expect(fixture.families?.sa?.name).toBe('ValeDourado');
    expect(fixture.families?.sa?.pets).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'staging-test-pet' })]),
    );
    expect(fixture.families?.sa?.mounts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'staging-test-mount' })]),
    );
    expect(fixture.recipes).toHaveLength(6);
    expect(fixture.recipes.map((recipe) => recipe.name)).toEqual(
      expect.arrayContaining(['Prato de Teste', 'Elixir de Teste', 'Lingote de Teste']),
    );
    expect(fixture.quotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 2001, name: 'Prato de Teste', source: 'manual' }),
        expect.objectContaining({ itemId: 3001, name: 'Arma de Teste', source: 'manual' }),
      ]),
    );
    expect(fixture.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 1001, kind: 'storage', location: 'Velia' }),
        expect.objectContaining({ itemId: 2001, kind: 'inventory' }),
      ]),
    );
    expect(fixture.personalPlans.map((plan) => plan.status)).toContain('reserved');
    expect(fixture.sessions).toHaveLength(3);
    expect(fixture.gear).toHaveLength(2);
    expect(fixture.presets.map((preset) => preset.tool)).toEqual(
      expect.arrayContaining(['market', 'crafting', 'gear']),
    );
    expect(fixture.projects).toHaveLength(1);
    expect(fixture.buffs.length).toBeGreaterThan(0);
    expect(fixture.enhancementLog).toHaveLength(2);
  });

  it('merges seed records idempotently without replacing user data', () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const fixture = buildStagingTestWorkspace(recipeFixture, gearItems, now);
    const initial = emptyWorkspace();
    initial.familySilver = '987654321';
    initial.quotes = [
      {
        id: 'user-quote',
        name: 'Cotação da pessoa',
        category: 'Outros',
        region: 'sa',
        price: '100',
        source: 'manual',
        nameLocale: null,
        itemId: 4001,
        subId: null,
        stock: 1,
        observedAt: now.toISOString(),
        favorite: false,
        history: [],
      },
    ];

    const seeded = mergeStagingTestWorkspace(initial, fixture);
    const reseeded = mergeStagingTestWorkspace(seeded, fixture);

    expect(seeded.familySilver).toBe('987654321');
    expect(seeded.quotes[0]).toMatchObject({ id: 'user-quote', name: 'Cotação da pessoa' });
    expect(reseeded.quotes).toEqual(seeded.quotes);
    expect(reseeded.inventory).toEqual(seeded.inventory);
    expect(reseeded.characters).toEqual(seeded.characters);
  });

  it('fills an empty family profile while preserving populated family values', () => {
    const fixture = buildStagingTestWorkspace(recipeFixture, gearItems);
    const initial = emptyWorkspace();
    initial.families = {
      sa: {
        name: '',
        contribution: null,
        energyMax: null,
        lifeSkills: null,
        pets: [],
        mounts: [],
      },
    };

    const seeded = mergeStagingTestWorkspace(initial, fixture);

    expect(seeded.families?.sa?.name).toBe('ValeDourado');
    expect(seeded.families?.sa?.contribution).toBe(360);
    expect(seeded.families?.sa?.energyMax).toBe(450);
    expect(seeded.families?.sa?.lifeSkills?.cooking?.tier).toBe('Guru');
    expect(seeded.families?.sa?.pets).toHaveLength(2);
    expect(seeded.familyLifeSkills?.cooking?.tier).toBe('Guru');
  });
});
