import { planProduction } from '@bdo/calculators';
import { emptyWorkspace, type Workspace } from '@bdo/calculators/workspace';
import type { CatalogRecipe } from '@bdo/shared';
import type { MarketItemQuote } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import {
  alchemySpecialProductExpectedYield,
  cookingRareProductExpectedYield,
} from './recipe-mastery';
import {
  buildRecipeProductionInput,
  defaultRecipeMethodSeconds,
} from './recipe-production-adapter';
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
  it('uses the cooking action duration for the COOK catalog type', () => {
    expect(defaultRecipeMethodSeconds('COOK')).toBe(1.2);
  });

  it('reduces cooking action time by its mastery mass-production rate', () => {
    const root = recipe('cooking-root', 100, [], null, 'COOK');
    const result = buildRecipeProductionInput(
      graph(root),
      1,
      emptyWorkspace(),
      new Map(),
      new Map([['COOK', 1.2]]),
      new Map(),
      new Map(),
      now,
      { masteryOverrides: { cooking: 3000 } },
    );

    expect(result.estimates['cooking-root']?.craftSeconds).toBeCloseTo(0.12);
  });

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
      producer: { expectedYield: 212.5, craftSeconds: 8, source: 'calibrated' },
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

  it('applies independent temporary mastery overrides to each profession in one recipe graph', () => {
    const root = recipe('simple-root', 10, [{ itemId: 20, quantity: '1' }], '10', 'SIMPLE_ALCHEMY');
    const alchemy = recipe(
      'alchemy-producer',
      20,
      [{ itemId: 21, quantity: '1' }],
      null,
      'ALCHEMY',
    );
    const processing = recipe(
      'processing-producer',
      30,
      [{ itemId: 31, quantity: '1' }],
      null,
      'PROCESSING',
    );
    const result = buildRecipeProductionInput(
      graph(root, [alchemy, processing]),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
      { masteryOverrides: { alchemy: 3000, processing: 0 } },
    );

    expect(result.estimates['simple-root']?.expectedYield).toBe(10);
    expect(result.estimates['alchemy-producer']?.expectedYield).toBe(3.438);
    expect(result.estimates['processing-producer']?.expectedYield).toBe(2.5);
    expect(result.recipes.find((entry) => entry.id === 'processing-producer')?.ingredients).toEqual(
      [{ itemId: 31, quantity: 1 }],
    );
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

  it('includes Valencia special meals as a mastery-scaled, priced sale byproduct', () => {
    const valencia = recipe(
      'valencia-meal',
      9609,
      [9216, 9218, 9219, 9305, 9463].map((itemId) => ({
        itemId,
        quantity: itemId === 9305 ? '2' : '1',
      })),
      null,
      'COOK',
    );
    const quotes = new Map(
      [9609, 9610, 9216, 9218, 9219, 9305, 9463].map((itemId) => [itemId, quote(itemId)]),
    );
    const result = buildRecipeProductionInput(
      graph(valencia),
      1000,
      emptyWorkspace(),
      quotes,
      new Map([['COOK', 1.2]]),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([...quotes.keys()].map((id) => [id, now.toISOString()])),
        masteryOverride: 3000,
        masterySkill: 'cooking',
      },
    );

    expect(result.estimates['valencia-meal']?.expectedYield).toBe(3.647);
    expect(result.recipes[0].byproducts).toEqual([
      { itemId: 9610, quantity: null },
      { itemId: 9065, quantity: null },
    ]);
    expect(result.byproductValues?.['valencia-meal']).toEqual(
      expect.arrayContaining([
        {
          itemId: 9610,
          expectedQuantity: expect.closeTo(0.831955, 5),
          unitPrice: '100',
          sell: true,
        },
        {
          itemId: 9065,
          expectedQuantity: 0.2832,
          unitPrice: '',
          sell: false,
        },
      ]),
    );
    const kept = buildRecipeProductionInput(
      graph(valencia),
      1000,
      emptyWorkspace(),
      quotes,
      new Map([['COOK', 1.2]]),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([...quotes.keys()].map((id) => [id, now.toISOString()])),
        masteryOverride: 3000,
        masterySkill: 'cooking',
        byproductSales: new Map([[9610, false]]),
      },
    );
    const soldPlan = planProduction(result).ranked.find((plan) => plan.scenario === 'buy-all');
    const keptPlan = planProduction(kept).ranked.find((plan) => plan.scenario === 'buy-all');
    expect(Number(soldPlan?.netRevenue ?? 0)).toBeGreaterThan(Number(keptPlan?.netRevenue ?? 0));
  });

  it('includes the standard alchemy byproduct and weighted mastery bonus items', () => {
    const bonusItemIds = [
      5301, 5302, 6601, 6602, 6603, 6604, 6605, 16001, 4924, 721002, 4076, 4481, 4684, 6183, 44336,
      5019, 5304, 44195, 4998, 820910, 5306, 16080, 5964, 721003, 766107, 45216, 45248, 45280,
    ];
    const quotes = new Map(bonusItemIds.map((itemId) => [itemId, quote(itemId)]));
    const result = buildRecipeProductionInput(
      graph(recipe('alchemy-root', 791, [])),
      1,
      emptyWorkspace(),
      quotes,
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map(bonusItemIds.map((itemId) => [itemId, now.toISOString()])),
        masteryOverride: 3000,
        masterySkill: 'alchemy',
      },
    );

    const returns = result.byproductValues?.['alchemy-root'] ?? [];
    expect(returns).toHaveLength(28);
    expect(returns.find((product) => product.itemId === 5301)?.expectedQuantity).toBeCloseTo(
      5.2430313649,
      8,
    );
    expect(returns.reduce((sum, product) => sum + product.expectedQuantity, 0)).toBeCloseTo(
      5.3108110004,
      8,
    );
    expect(returns.find((product) => product.itemId === 5302)?.sell).toBe(true);
    expect(
      result.recipes[0]?.byproducts?.map((product) => product.itemId).sort((a, b) => a - b),
    ).toEqual([...bonusItemIds].sort((a, b) => a - b));
  });

  it('keeps unpriced random alchemy returns out of revenue by default', () => {
    const result = buildRecipeProductionInput(
      graph(recipe('alchemy-root', 791, [])),
      1,
      emptyWorkspace(),
      new Map([[5301, quote(5301)]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([[5301, now.toISOString()]]),
        masteryOverride: 3000,
        masterySkill: 'alchemy',
      },
    );

    expect(
      result.byproductValues?.['alchemy-root']?.find((product) => product.itemId === 5302),
    ).toMatchObject({
      unitPrice: '',
      sell: false,
    });
  });

  it('exposes catalog secondary outputs as separately priced returns', () => {
    const meal = recipe('meal', 100, [], '1', 'COOK');
    meal.outputs.push({ itemId: 101, name: 'Retorno da receita', quantity: '2' });
    const quotes = new Map([
      [100, quote(100, '500')],
      [101, quote(101, '200')],
    ]);

    const result = buildRecipeProductionInput(
      graph(meal),
      10,
      emptyWorkspace(),
      quotes,
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([
          [100, now.toISOString()],
          [101, now.toISOString()],
        ]),
      },
    );

    expect(result.recipes[0]?.byproducts).toEqual([
      { itemId: 101, quantity: 2 },
      { itemId: 9065, quantity: null },
    ]);
    expect(result.byproductValues?.['meal']).toEqual(
      expect.arrayContaining([
        { itemId: 101, expectedQuantity: 2, unitPrice: '200', sell: true },
        { itemId: 9065, expectedQuantity: 0.2832, unitPrice: '', sell: false },
      ]),
    );
  });

  it('values catalog alchemy byproducts at 10 outputs times the mastery special-item chance', () => {
    const elixir = recipe('elixir', 749, [], null, 'ALCHEMY');
    const returnRecipe: CatalogRecipe = {
      ...recipe('elixir-special', 750, [], null, 'ALCHEMY'),
      byproductOfItemId: 749,
    };
    const quotes = new Map([
      [749, quote(749, '500')],
      [750, quote(750, '2000')],
    ]);
    const graphWithReturns = {
      ...graph(elixir),
      returnRecipes: [returnRecipe],
    } as RecipeProductionGraph;

    const result = buildRecipeProductionInput(
      graphWithReturns,
      1000,
      emptyWorkspace(),
      quotes,
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        quoteObservedAt: new Map([
          [749, now.toISOString()],
          [750, now.toISOString()],
        ]),
        masteryOverride: 3000,
        masterySkill: 'alchemy',
      },
    );

    expect(result.recipes[0]?.byproducts).toContainEqual({ itemId: 750, quantity: null });
    expect(result.byproductValues?.['elixir']).toContainEqual({
      itemId: 750,
      expectedQuantity: alchemySpecialProductExpectedYield(3000),
      unitPrice: '2000',
      sell: true,
    });
  });

  it('lets a recipe mark the Valencia special meal to keep instead of sell', () => {
    const valencia = recipe('valencia-meal', 9609, [], null, 'COOK');
    const result = buildRecipeProductionInput(
      graph(valencia),
      100,
      emptyWorkspace(),
      new Map([[9610, quote(9610)]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        masteryOverride: 3000,
        masterySkill: 'cooking',
        byproductSales: new Map([[9610, false]]),
      },
    );

    expect(
      result.byproductValues?.['valencia-meal']?.find((item) => item.itemId === 9610),
    ).toMatchObject({
      itemId: 9610,
      sell: false,
    });
  });

  it('accounts for cooking rare procs and milk byproducts at the 3000 mastery bracket', () => {
    const couscous = recipe('couscous', 9220, [], null, 'COOK');
    const result = buildRecipeProductionInput(
      graph(couscous),
      1000,
      emptyWorkspace(),
      new Map([
        [9305, quote(9305, '10000')],
        [9065, quote(9065, '20000')],
      ]),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        masteryOverride: 3000,
        masterySkill: 'cooking',
        quoteObservedAt: new Map([
          [9305, now.toISOString()],
          [9065, now.toISOString()],
        ]),
      },
    );

    const returns = result.byproductValues?.['couscous'] ?? [];
    expect(returns.find((item) => item.itemId === 9305)).toMatchObject({
      expectedQuantity: cookingRareProductExpectedYield(3000),
      unitPrice: '10000',
      sell: true,
    });
    expect(returns.find((item) => item.itemId === 9065)).toMatchObject({
      expectedQuantity: 0.2832,
      unitPrice: '20000',
      sell: true,
    });
  });

  it('adapts cooking rare products as optional three-to-one recipe substitutes', () => {
    const root = recipe('final', 100, [{ itemId: 9216, quantity: '4' }], '1', 'ALCHEMY');
    const figPie = recipe('fig-pie', 9216, [], null, 'COOK');
    const result = buildRecipeProductionInput(
      graph(root, [figPie]),
      1,
      emptyWorkspace(),
      new Map([[9301, quote(9301, '10000')]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        masteryOverrides: { cooking: 3000 },
        quoteObservedAt: new Map([[9301, now.toISOString()]]),
        useRareProcs: new Set(['fig-pie']),
      },
    );

    expect(result.recipes.find((row) => row.id === 'fig-pie')).toMatchObject({
      rareSubstitution: { itemId: 9301, ratio: 3 },
    });
    expect(result.useRareProcs).toEqual({ 'fig-pie': true });
    expect(result.byproductValues?.['fig-pie']).toContainEqual(
      expect.objectContaining({
        itemId: 9301,
        expectedQuantity: cookingRareProductExpectedYield(3000),
      }),
    );
  });

  it('accounts for the Oatmeal rare proc that returns Refined Oatmeal', () => {
    const oatmeal = recipe('oatmeal', 9261, [], null, 'COOK');
    const result = buildRecipeProductionInput(
      graph(oatmeal),
      1000,
      emptyWorkspace(),
      new Map([[9276, quote(9276, '25000')]]),
      new Map(),
      new Map(),
      new Map(),
      now,
      {
        masteryOverride: 3000,
        masterySkill: 'cooking',
        quoteObservedAt: new Map([[9276, now.toISOString()]]),
      },
    );

    expect(result.byproductValues?.['oatmeal']?.find((item) => item.itemId === 9276)).toMatchObject(
      {
        expectedQuantity: cookingRareProductExpectedYield(3000),
        unitPrice: '25000',
        sell: true,
      },
    );
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

  it('applies the selected mastery to an intermediate recipe whose catalog output is one', () => {
    const root = recipe('simple-root', 100, [{ itemId: 2, quantity: '1' }], null, 'SIMPLE_ALCHEMY');
    const producer = recipe('normal-alchemy', 2, [{ itemId: 3, quantity: '1' }], '1', 'ALCHEMY');
    const result = buildRecipeProductionInput(
      graph(root, [producer]),
      1,
      emptyWorkspace(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      now,
      { masteryOverride: 3000, masterySkill: 'alchemy' },
    );

    expect(result.estimates['normal-alchemy']?.expectedYield).toBeCloseTo(3.4375);
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
