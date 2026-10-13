import { emptyWorkspace, type Workspace } from '@bdo/calculators/workspace';
import type { CatalogRecipe } from '@bdo/shared';
import type { MarketItemQuote } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { buildRecipeProductionInput } from './recipe-production-adapter';
import type { RecipeProductionGraph } from './recipe-production-graph';

const now = new Date('2026-10-10T12:00:00.000Z');

function recipe(
  key: string,
  output: number,
  inputs: Array<{ itemId: number; quantity: string | null }>,
  outputQuantity: string | null = '1',
  type = 'ALCHEMY',
): CatalogRecipe {
  return {
    key,
    type,
    station: null,
    inputs: inputs.map((input) => ({ ...input, name: `Item ${input.itemId}` })),
    outputs: [{ itemId: output, name: `Item ${output}`, quantity: outputQuantity }],
  };
}

function graph(root: CatalogRecipe, producerRecipes: CatalogRecipe[] = []): RecipeProductionGraph {
  return {
    rootRecipe: root,
    producerRecipes,
    itemIds: [...new Set([root.outputs[0].itemId, ...root.inputs.map((part) => part.itemId)])],
    issues: [],
    datasetVersion: 'dataset-v1',
  };
}

function quote(itemId: number, price = '100'): MarketItemQuote {
  return {
    itemId,
    subId: 0,
    name: `Item ${itemId}`,
    price,
    stock: 100,
    totalTrades: '10',
    minPrice: price,
    maxPrice: price,
    lastSoldPrice: price,
    lastSoldAt: now.toISOString(),
  };
}

describe('recipe production planner adapter', () => {
  it('uses the sourced NPC purchase price for Ibellab instead of requiring market stock', () => {
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 4986, quantity: '1' }])),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        npcPurchasePrices: new Map([
          [
            4986,
            {
              itemId: 4986,
              unitPrice: '10000',
              vendor: 'Vendedor NPC listado no catálogo',
              verifiedAt: '2026-10-10T12:22:17.854Z',
            },
          ],
        ]),
      },
    );
    expect(result.quotes[4986]).toMatchObject({ unitPrice: '10000', source: 'npc' });
    expect(result.gatheringEstimates).toEqual({});
  });
  it('keeps the live market price when an item also has a catalog NPC price', () => {
    const observedAt = now.toISOString();
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 4986, quantity: '1' }])),
      1,
      emptyWorkspace(),
      new Map([[4986, { ...quote(4986, '900'), maxPrice: '1500' }]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([[4986, observedAt]]),
        npcPurchasePrices: new Map([
          [
            4986,
            {
              itemId: 4986,
              unitPrice: '10000',
              vendor: 'Vendedor NPC listado no catálogo',
              verifiedAt: observedAt,
            },
          ],
        ]),
      },
    );

    expect(result.quotes[4986]).toMatchObject({ unitPrice: '900', source: 'market' });
  });
  it('uses the maximum market price when the item has no stock', () => {
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 4986, quantity: '1' }])),
      1,
      emptyWorkspace(),
      new Map([[4986, { ...quote(4986, '900'), stock: 0, maxPrice: '1500' }]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      { quoteObservedAt: new Map([[4986, now.toISOString()]]) },
    );

    expect(result.quotes[4986]).toMatchObject({
      unitPrice: '1500',
      available: 0,
      source: 'market',
    });
    expect(result.enforcePurchaseLimits).toBe(false);
  });
  it('falls back to the catalog NPC price when the market quote has no positive price', () => {
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 4986, quantity: '1' }])),
      1,
      emptyWorkspace(),
      new Map([[4986, quote(4986, '0')]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([[4986, now.toISOString()]]),
        npcPurchasePrices: new Map([
          [
            4986,
            {
              itemId: 4986,
              unitPrice: '10000',
              vendor: 'Vendedor NPC listado no catálogo',
              verifiedAt: now.toISOString(),
            },
          ],
        ]),
      },
    );

    expect(result.quotes[4986]).toMatchObject({ unitPrice: '10000', source: 'npc' });
  });
  it('maps the selected root and reachable producers with explicit method times', () => {
    const root = recipe('root', 100, [{ itemId: 2, quantity: '3' }], null);
    const producer = recipe('producer', 2, [{ itemId: 3, quantity: '2' }], '1', 'PROCESSING');
    const workspace = emptyWorkspace();
    const result = buildRecipeProductionInput(
      graph(root, [producer]),
      4,
      workspace,
      new Map([
        [100, quote(100)],
        [2, quote(2)],
        [3, quote(3)],
      ]),
      new Map([
        ['ALCHEMY', 12],
        ['PROCESSING', 8],
      ]),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([
          [100, now.toISOString()],
          [2, now.toISOString()],
          [3, now.toISOString()],
        ]),
      },
    );

    expect(result.recipes.map((entry) => entry.id)).toEqual(['root', 'producer']);
    expect(result.candidates).toEqual([{ recipeId: 'root', crafts: 4, optimizeCrafts: 4 }]);
    expect(result.maxOptimizationStates).toBe(10_000);
    expect(result.estimates).toMatchObject({
      root: { expectedYield: 2.829, craftSeconds: 12, source: 'calibrated' },
      producer: { expectedYield: 85, craftSeconds: 8, source: 'calibrated' },
    });
    expect(result.recipes[1]?.ingredients).toEqual([{ itemId: 3, quantity: 170 }]);
    expect(result.quotes[100]).toMatchObject({ unitPrice: '100', source: 'market' });
  });

  it('scales processing output and required materials by the mastery material count', () => {
    const root = recipe('grind-wheat', 304, [{ itemId: 201, quantity: '1' }], null, 'PROCESSING');
    const result = buildRecipeProductionInput(
      graph(root),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
      { masteryOverride: 1000, masterySkill: 'processing' },
    );

    expect(result.estimates['grind-wheat']?.expectedYield).toBe(212.5);
    expect(result.recipes[0]?.ingredients).toEqual([{ itemId: 201, quantity: 85 }]);
  });

  it('excludes stock reserved by active personal plans', () => {
    const workspace = emptyWorkspace();
    workspace.inventory.push({
      id: 'stock-2',
      itemId: 2,
      name: 'Item 2',
      location: 'Velia',
      quantity: 10,
      target: 10,
      price: '100',
      region: 'sa',
      kind: 'storage',
    });
    workspace.personalPlans.push({
      id: 'reserved-plan',
      name: 'Plano ativo',
      region: 'sa',
      status: 'reserved',
      createdAt: now.toISOString(),
      minutes: 0,
      estimatedProfit: null,
      materials: [{ itemId: 2, name: 'Item 2', quantity: 7 }],
      tasks: [],
    });

    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 2, quantity: '1' }])),
      1,
      workspace,
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
    );

    expect(result.inventory).toEqual([{ itemId: 2, quantity: 3, reserved: 0 }]);
  });

  it('maps manual source overrides by item ID', () => {
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 2, quantity: '1' }])),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map([[2, 'gather']]),
      now,
    );

    expect(result.customChoices).toEqual({ 2: 'gather' });
  });

  it('keeps the verified Edania yield fixed', () => {
    const edania = recipe(
      'edania',
      1407,
      [
        { itemId: 702, quantity: '3' },
        { itemId: 1399, quantity: '1' },
        { itemId: 1409, quantity: '3' },
        { itemId: 820936, quantity: '1' },
      ],
      null,
      'SIMPLE_ALCHEMY',
    );
    const result = buildRecipeProductionInput(
      graph(edania),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
    );

    expect(result.estimates['edania']).toMatchObject({ expectedYield: 1, source: 'fixed' });
    expect(result.recipes[0].output.quantity).toBe(1);
  });

  it('does not let a manual yield override replace a fixed Edania yield', () => {
    const edania = recipe(
      'edania',
      1407,
      [
        { itemId: 702, quantity: '3' },
        { itemId: 1399, quantity: '1' },
        { itemId: 1409, quantity: '3' },
        { itemId: 820936, quantity: '1' },
      ],
      null,
      'SIMPLE_ALCHEMY',
    );
    const result = buildRecipeProductionInput(
      graph(edania),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
      { yieldOverrides: new Map([[1407, 12]]) },
    );

    expect(result.estimates['edania']).toMatchObject({ expectedYield: 1, source: 'fixed' });
  });

  it('marks variable catalog yields as estimates', () => {
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 2, quantity: '1' }], null, 'COOKING')),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
    );

    expect(result.estimates['root']).toMatchObject({ expectedYield: 2.767, source: 'informed' });
  });

  it('maps an explicit gathering estimate and leaves unknown inputs absent', () => {
    const estimate = {
      expectedYield: 4,
      craftSeconds: 20,
      source: 'calibrated' as const,
      origin: 'user-confirmed' as const,
    };
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 2, quantity: '1' }], null)),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map([[2, estimate]]),
      new Map(),
      now,
    );

    expect(result.gatheringEstimates).toEqual({ 2: estimate });
    expect(result.estimates['root']?.craftSeconds).toBeUndefined();
    expect(result.quotes).toEqual({});
  });

  it('uses only API quotes with observed timestamps and ignores manual workspace prices', () => {
    const workspace = emptyWorkspace() as Workspace;
    workspace.quotes.push({
      id: 'manual-item-100',
      name: 'Item 100',
      category: 'Alchemy',
      region: 'sa',
      price: '500',
      source: 'manual',
      nameLocale: 'pt',
      itemId: 100,
      subId: 0,
      stock: 5,
      observedAt: now.toISOString(),
      favorite: false,
      history: [],
    });
    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 2, quantity: '1' }])),
      1,
      workspace,
      new Map([[2, quote(2)]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      { quoteObservedAt: new Map([[2, now.toISOString()]]) },
    );

    expect(result.quotes[2]).toMatchObject({ unitPrice: '100', source: 'market' });
    expect(result.quotes[100]).toBeUndefined();
    expect(result.estimates['root']?.craftSeconds).toBeUndefined();
  });

  it('excludes stock by the same location key used by the stock controls', () => {
    const workspace = emptyWorkspace() as Workspace;
    workspace.inventory.push({
      id: 'inventory-2',
      itemId: 2,
      name: 'Item 2',
      location: 'Aventureiro',
      quantity: 5,
      target: 5,
      price: '100',
      region: 'sa',
      kind: 'inventory',
      characterId: 'character-1',
    });
    const locationKey = JSON.stringify(['inventory', 'character-1']);

    const result = buildRecipeProductionInput(
      graph(recipe('root', 100, [{ itemId: 2, quantity: '1' }])),
      1,
      workspace,
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
      { excludedLocations: [locationKey] },
    );

    expect(result.inventory).toEqual([]);
  });
});
