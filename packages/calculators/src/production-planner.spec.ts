import { describe, expect, it } from 'vitest';

import { edaniaSelectedGraphFixture } from './fixtures/edania-selected-graph';
import {
  compareProductionPlans,
  planProduction,
  type ProductionPlannerInput,
} from './production-planner';

const now = '2026-10-09T12:00:00.000Z';
it('merges batches by exact rates even when displayed hourly silver ties', () => {
  const base = planProduction(fixture()).ranked[0];
  const slower = {
    ...base,
    recipeId: 'a-slower',
    profit: '1',
    seconds: 3600,
    durationMilliseconds: '3600000',
    profitPerHour: '1',
  };
  const faster = {
    ...base,
    recipeId: 'z-faster',
    profit: '1',
    seconds: 3599.5,
    durationMilliseconds: '3599500',
    profitPerHour: '1',
  };
  expect([slower, faster].sort(compareProductionPlans)[0].recipeId).toBe('z-faster');
});
function fixture(): ProductionPlannerInput {
  return {
    recipes: [
      {
        id: 'final',
        name: 'Final',
        method: 'cook',
        output: { itemId: 3, quantity: 1 },
        ingredients: [{ itemId: 2, quantity: 2 }],
      },
      {
        id: 'middle',
        name: 'Middle',
        method: 'process',
        output: { itemId: 2, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 2 }],
      },
    ],
    quotes: {
      1: { unitPrice: '10', available: 100, observedAt: now, source: 'market' },
      2: { unitPrice: '30', available: 100, observedAt: now, source: 'market' },
      3: { unitPrice: '200', available: 100, observedAt: now, source: 'market' },
    },
    inventory: [],
    estimates: {
      final: { craftSeconds: 60, source: 'informed' },
      middle: { craftSeconds: 30, source: 'fixed' },
    },
    candidates: [{ recipeId: 'final', crafts: 1 }],
    profile: { budget: '10000', activeMinutes: 60 },
    tax: { taxPercent: 35, valuePack: false, collectionBonus: 0, exempt: false },
    now,
  };
}
const row = (input: ProductionPlannerInput, scenario: string) =>
  [...planProduction(input).ranked, ...planProduction(input).incomplete].find(
    (r) => r.scenario === scenario,
  )!;

describe('production planner', () => {
  it('changes hourly profit through intermediate craft time without changing total profit', () => {
    const input = fixture();
    const first = row(input, 'produce-all');
    input.estimates.middle.craftSeconds = 60;
    const slower = row(input, 'produce-all');
    expect(first.seconds).toBe(120);
    expect(slower.seconds).toBe(180);
    expect(slower.profit).toBe(first.profit);
    expect(first.profitPerHour).toBe('2700');
    expect(slower.profitPerHour).toBe('1800');
  });
  it('calculates a zero-stock purchase from the supplied maximum price without stock gating', () => {
    const input = fixture();
    input.enforcePurchaseLimits = false;
    input.quotes[2].available = 0;
    input.quotes[2].unitPrice = '90';

    const buyAll = row(input, 'buy-all');

    expect(buyAll.cashCost).toBe('180');
    expect(buyAll.issues.some((issue) => issue.code === 'market-stock')).toBe(false);
  });

  it('reproduces the observed Workshop buy-all arithmetic without importing live EU prices', () => {
    const input = fixture();
    input.enforcePurchaseLimits = false;
    input.recipes = [
      {
        id: 'final',
        name: 'Workshop reference',
        method: 'simple-alchemy',
        output: { itemId: 1408, quantity: 10 },
        ingredients: [
          { itemId: 1, quantity: 60 },
          { itemId: 2, quantity: 10 },
          { itemId: 4986, quantity: 1 },
        ],
      },
    ];
    input.estimates = { final: { source: 'fixed', craftSeconds: 6 } };
    input.quotes = {
      1: { unitPrice: '16200000', available: 0, observedAt: now, source: 'market' },
      2: { unitPrice: '20500000', available: 0, observedAt: now, source: 'market' },
      4986: { unitPrice: '10000', available: null, observedAt: now, source: 'npc' },
      1408: { unitPrice: '187000000', available: 0, observedAt: now, source: 'market' },
    };
    input.tax.valuePack = true;
    input.candidates = [{ recipeId: 'final', crafts: 1000 }];
    const result = row(input, 'buy-all');
    expect(result.output).toBe(10000);
    expect(result.seconds).toBe(6000);
    expect(result.netRevenue).toBe('1580150000000');
    expect(result.cashCost).toBe('1177010000000');
    expect(result.profit).toBe('403140000000');
    expect(result.profitPerHour).toBe('241884000000');
  });
  it('finds the fastest profitable hybrid of buying and producing intermediates', () => {
    const input = fixture();
    input.recipes = [
      {
        id: 'final',
        name: 'Final',
        method: 'cook',
        output: { itemId: 3, quantity: 1 },
        ingredients: [
          { itemId: 2, quantity: 1 },
          { itemId: 4, quantity: 1 },
        ],
      },
      {
        id: 'slow-middle',
        name: 'Intermediário lento',
        method: 'process',
        output: { itemId: 2, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 1 }],
      },
      {
        id: 'fast-middle',
        name: 'Intermediário rápido',
        method: 'process',
        output: { itemId: 4, quantity: 1 },
        ingredients: [{ itemId: 5, quantity: 1 }],
      },
    ];
    input.quotes = {
      1: { unitPrice: '10', available: 100, observedAt: now, source: 'market' },
      2: { unitPrice: '11', available: 100, observedAt: now, source: 'market' },
      3: { unitPrice: '1000', available: 100, observedAt: now, source: 'market' },
      4: { unitPrice: '30', available: 100, observedAt: now, source: 'market' },
      5: { unitPrice: '10', available: 100, observedAt: now, source: 'market' },
    };
    input.estimates = {
      final: { craftSeconds: 60, source: 'fixed' },
      'slow-middle': { craftSeconds: 600, source: 'fixed' },
      'fast-middle': { craftSeconds: 1, source: 'fixed' },
    };
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];

    const optimized = planProduction(input).ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized).toMatchObject({
      cashCost: '21',
      economicCost: '21',
      profit: '629',
      seconds: 61,
    });
    expect(optimized?.materials).toEqual([
      { itemId: 2, required: 1, bought: 1, owned: 0, produced: 0, substituted: 0 },
      { itemId: 4, required: 1, bought: 0, owned: 0, produced: 1, substituted: 0 },
      { itemId: 5, required: 1, bought: 1, owned: 0, produced: 0, substituted: 0 },
    ]);
    expect(optimized?.sourceChoices).toEqual({ 2: 'buy', 4: 'produce', 5: 'buy' });
  });

  it('selects confirmed gathering when it beats buying or producing an available intermediate', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.gatheringEstimates = {
      2: { expectedYield: 1, craftSeconds: 1, source: 'user-confirmed' },
    };

    const optimized = planProduction(input).ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized).toMatchObject({
      sourceChoices: { 2: 'gather' },
      profit: '130',
      seconds: 62,
      issues: [],
    });
  });

  it('optimizes nested buy and produce decisions for 1000 recipes including all time and revenue', () => {
    const input = fixture();
    input.enforcePurchaseLimits = false;
    input.recipes = [
      {
        id: 'final',
        name: 'Final',
        method: 'alchemy',
        output: { itemId: 3, quantity: 1 },
        ingredients: [
          { itemId: 2, quantity: 1 },
          { itemId: 4, quantity: 1 },
        ],
      },
      {
        id: 'slow',
        name: 'Slow',
        method: 'alchemy',
        output: { itemId: 2, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 1 }],
      },
      {
        id: 'middle',
        name: 'Middle',
        method: 'alchemy',
        output: { itemId: 4, quantity: 1 },
        ingredients: [{ itemId: 5, quantity: 1 }],
      },
      {
        id: 'nested',
        name: 'Nested',
        method: 'alchemy',
        output: { itemId: 5, quantity: 1 },
        ingredients: [{ itemId: 6, quantity: 1 }],
      },
    ];
    input.quotes = Object.fromEntries(
      [
        [1, 10],
        [2, 11],
        [3, 1000],
        [4, 30],
        [5, 10],
        [6, 1],
      ].map(([id, price]) => [
        id,
        { unitPrice: String(price), available: null, observedAt: now, source: 'market' as const },
      ]),
    );
    input.estimates = {
      final: { craftSeconds: 60, source: 'fixed' },
      slow: { craftSeconds: 600, source: 'fixed' },
      middle: { craftSeconds: 1, source: 'fixed' },
      nested: { craftSeconds: 0.1, source: 'fixed' },
    };
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1000 }];
    const optimized = planProduction(input).ranked.find((plan) => plan.scenario === 'optimized');
    expect(optimized).toMatchObject({
      sourceChoices: { 2: 'buy', 4: 'produce', 5: 'produce', 6: 'buy' },
      crafts: 1000,
      seconds: 61100,
      grossRevenue: '1000000',
      netRevenue: '650000',
      economicCost: '12000',
      profit: '638000',
    });
  });

  it('uses only unreserved stock in the automatic strategy', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.inventory = [{ itemId: 2, quantity: 2, reserved: 1 }];
    input.useOwnedInProduction = true;

    const optimized = planProduction(input).ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized?.materials.find((row) => row.itemId === 2)?.owned).toBe(1);
    expect(input.inventory[0].quantity).toBe(2);
  });

  it('returns the best found candidate with its metrics when the route search reaches its limit', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.maxOptimizationStates = 1;

    const result = planProduction(input);

    const partial = result.incomplete.find((plan) => plan.scenario === 'optimized');

    expect(partial).toMatchObject({
      profit: expect.any(String),
      profitPerHour: expect.any(String),
      sourceChoices: expect.any(Object),
    });
    expect(partial?.issues).toContainEqual(expect.objectContaining({ code: 'optimization-limit' }));
  });

  it('never returns a limited optimization below the feasible all-produced baseline', () => {
    const input = fixture();
    input.quotes[2].unitPrice = '100';
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.maxOptimizationStates = 1;

    const result = planProduction(input);
    const optimized = result.incomplete.find((plan) => plan.scenario === 'optimized');
    const allProduced = row(input, 'produce-all');

    expect(Number(optimized?.profitPerHour)).toBeGreaterThanOrEqual(
      Number(allProduced.profitPerHour),
    );
    expect(optimized?.sourceChoices).toMatchObject({ 2: 'produce' });
  });

  it('keeps the current valid source combination as a floor when optimization is limited', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.maxOptimizationStates = 1;
    input.customChoices = { 2: 'gather' };
    input.gatheringEstimates = {
      2: {
        expectedYield: 2,
        craftSeconds: 1,
        source: 'calibrated',
        origin: 'user-confirmed',
      },
    };

    const result = planProduction(input);
    const optimized = result.incomplete.find((plan) => plan.scenario === 'optimized');
    const current = row(input, 'custom');

    expect(Number(optimized?.profitPerHour)).toBeGreaterThanOrEqual(Number(current.profitPerHour));
    expect(optimized?.sourceChoices).toMatchObject({ 2: 'gather' });
  });

  it('prunes only when the best complete rate beats a safe profit and time upper bound', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.quotes[3].unitPrice = '1000';
    input.estimates.middle.craftSeconds = 600;

    const optimized = planProduction(input).ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized?.profit).toBe('590');
    expect(optimized?.seconds).toBe(60);
    expect(optimized?.assumptions.join(' ')).toContain(
      '1 estados podados pelo limite superior seguro',
    );
  });

  it('uses a branch-specific bound to prune when byproducts are sellable', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.quotes[3].unitPrice = '1000';
    input.quotes[4] = { unitPrice: '100', available: 100, observedAt: now, source: 'market' };
    input.recipes[1].byproducts = [{ itemId: 4, quantity: 1 }];
    input.byproductValues = {
      middle: [{ itemId: 4, expectedQuantity: 1, unitPrice: '100', sell: true }],
    };
    input.estimates.middle.craftSeconds = 600;

    const result = planProduction(input);
    const optimized = result.ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized?.profitPerHour).toBe('35400');
    expect(optimized?.assumptions.join(' ')).toContain(
      '1 estados podados pelo limite superior seguro',
    );
    expect(result.incomplete.some((plan) => plan.scenario === 'optimized')).toBe(false);
  });

  it('skips cyclic production choices before expanding the optimization search', () => {
    const input = fixture();
    input.recipes = [
      {
        id: 'final',
        name: 'Final',
        method: 'cook',
        output: { itemId: 3, quantity: 1 },
        ingredients: [{ itemId: 2, quantity: 1 }],
      },
      {
        id: 'middle',
        name: 'Middle',
        method: 'process',
        output: { itemId: 2, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 1 }],
      },
      {
        id: 'cyclic',
        name: 'Cyclic',
        method: 'process',
        output: { itemId: 1, quantity: 1 },
        ingredients: [{ itemId: 2, quantity: 1 }],
      },
    ];
    input.quotes[1] = { unitPrice: '10', available: 100, observedAt: now, source: 'market' };
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];

    const result = planProduction(input);
    const optimized = result.ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized).toBeDefined();
    expect(optimized?.assumptions.join(' ')).toContain(
      'escolhas de produção que criariam ciclos foram descartadas',
    );
    expect(result.incomplete.some((plan) => plan.scenario === 'optimized')).toBe(false);
  });

  it('keeps the exact best result when profit is negative', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.quotes[3].unitPrice = '1';
    input.quotes[2].unitPrice = '1000';
    input.quotes[1].unitPrice = '1';
    input.estimates.middle.craftSeconds = 600;

    const result = planProduction(input);
    const optimized = result.ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized?.profit).toBe('-4');
    expect(optimized?.materials.find((material) => material.itemId === 2)?.produced).toBe(2);
    expect(optimized?.assumptions.join(' ')).toContain(
      '0 estados podados pelo limite superior seguro',
    );
  });

  it('matches an exhaustive oracle when byproducts and surplus can be sold', () => {
    const input = fixture();
    input.recipes = [
      {
        id: 'final',
        name: 'Final',
        method: 'alchemy',
        output: { itemId: 3, quantity: 1 },
        ingredients: [
          { itemId: 2, quantity: 1 },
          { itemId: 4, quantity: 1 },
        ],
        byproducts: [{ itemId: 6, quantity: 1 }],
      },
      {
        id: 'middle-a',
        name: 'Meio A',
        method: 'processing',
        output: { itemId: 2, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 2 }],
        byproducts: [{ itemId: 7, quantity: 1 }],
      },
      {
        id: 'middle-b',
        name: 'Meio B',
        method: 'processing',
        output: { itemId: 4, quantity: 1 },
        ingredients: [{ itemId: 5, quantity: 1 }],
        byproducts: [{ itemId: 8, quantity: 1 }],
      },
    ];
    input.quotes = Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7, 8].map((itemId) => [
        itemId,
        {
          unitPrice: String(itemId === 3 ? 1000 : itemId >= 6 ? itemId * 100 : itemId * 10),
          available: 100,
          observedAt: now,
          source: 'market',
        },
      ]),
    );
    input.byproductValues = {
      final: [{ itemId: 6, expectedQuantity: 1, unitPrice: '600', sell: true }],
      'middle-a': [{ itemId: 7, expectedQuantity: 1, unitPrice: '700', sell: true }],
      'middle-b': [{ itemId: 8, expectedQuantity: 1, unitPrice: '800', sell: true }],
    };
    input.surplusSales = { 2: true, 4: true };
    input.estimates = {
      final: { craftSeconds: 5, source: 'fixed' },
      'middle-a': { expectedYield: 1.5, craftSeconds: 12, source: 'fixed' },
      'middle-b': { expectedYield: 1.5, craftSeconds: 2, source: 'fixed' },
    };
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    const automatic = planProduction(input).ranked.find((plan) => plan.scenario === 'optimized')!;
    const oracleInput = { ...input, candidates: [{ recipeId: 'final', crafts: 1 }] };
    const oracle = [
      { 2: 'buy', 4: 'buy' },
      { 2: 'buy', 4: 'produce' },
      { 2: 'produce', 4: 'buy' },
      { 2: 'produce', 4: 'produce' },
    ]
      .map(
        (customChoices) =>
          planProduction({ ...oracleInput, customChoices }).ranked.find(
            (plan) => plan.scenario === 'custom',
          )!,
      )
      .sort(compareProductionPlans)[0];

    expect(automatic.profit).toBe(oracle.profit);
    expect(automatic.profitPerHour).toBe(oracle.profitPerHour);
    expect(automatic.materials).toEqual(oracle.materials);
    expect(automatic.returns).toEqual(oracle.returns);
  });

  it('optimizes a 38-producer Edania chain without enumerating irrelevant descendants', () => {
    const input = fixture();
    const recipes = [
      {
        id: 'edania-root',
        name: 'Edania',
        method: 'alchemy',
        output: { itemId: 1407, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 1 }],
      },
    ];
    for (let index = 1; index <= 38; index++) {
      recipes.push({
        id: `edania-component-${index}`,
        name: `Componente ${index}`,
        method: 'alchemy',
        output: { itemId: index, quantity: 1 },
        ingredients: [{ itemId: index === 38 ? 999 : index + 1, quantity: 1 }],
      });
    }
    input.recipes = recipes;
    input.quotes = Object.fromEntries(
      [1407, 999, ...Array.from({ length: 38 }, (_, index) => index + 1)].map((itemId) => [
        itemId,
        {
          unitPrice: itemId === 1407 ? '100000' : '100',
          available: 100,
          observedAt: now,
          source: 'market',
        },
      ]),
    );
    input.estimates = Object.fromEntries(
      recipes.map((recipe) => [recipe.id, { craftSeconds: 1, source: 'fixed' }]),
    );
    input.candidates = [{ recipeId: 'edania-root', optimizeCrafts: 1 }];

    const result = planProduction(input);

    expect(result.ranked.find((plan) => plan.scenario === 'optimized')).toMatchObject({
      recipeId: 'edania-root',
      profit: '64900',
      seconds: 1,
    });
  });

  it('completes an exact search for the selected Edania catalog topology snapshot', () => {
    const topology = edaniaSelectedGraphFixture;
    const root = {
      id: topology.rootRecipeKey,
      name: 'Edania',
      method: 'alchemy',
      output: { itemId: topology.outputItemId, quantity: 1 },
      ingredients: topology.rootIngredientItemIds.map((itemId) => ({ itemId, quantity: 1 })),
    };
    const producers = topology.producers.map((producer) => ({
      id: producer.recipeKey,
      name: `Item ${producer.outputItemId}`,
      method: 'alchemy',
      output: { itemId: producer.outputItemId, quantity: 1 },
      ingredients: producer.ingredientItemIds.map((itemId) => ({ itemId, quantity: 1 })),
    }));
    const recipes = [root, ...producers].map((recipe, index) => ({
      ...recipe,
      byproducts: [{ itemId: 900_000 + index, quantity: 1 }],
    }));
    const byproductValues = Object.fromEntries(
      recipes.map((recipe, index) => [
        recipe.id,
        [{ itemId: 900_000 + index, expectedQuantity: 1, unitPrice: '1', sell: true }],
      ]),
    );
    const itemIds = new Set([
      topology.outputItemId,
      ...topology.rootIngredientItemIds,
      ...topology.producers.flatMap((producer) => [
        producer.outputItemId,
        ...producer.ingredientItemIds,
      ]),
    ]);
    const input = fixture();
    input.recipes = recipes;
    input.quotes = Object.fromEntries(
      [...itemIds, ...recipes.map((_, index) => 900_000 + index)].map((itemId) => [
        itemId,
        {
          unitPrice: String(itemId === topology.outputItemId ? 100_000 : 100),
          available: 1_000_000,
          observedAt: now,
          source: 'market' as const,
        },
      ]),
    );
    input.byproductValues = byproductValues;
    input.estimates = Object.fromEntries(
      recipes.map((recipe) => [recipe.id, { expectedYield: 1, craftSeconds: 1, source: 'fixed' }]),
    );
    input.candidates = [{ recipeId: topology.rootRecipeKey, optimizeCrafts: 1 }];
    input.maxOptimizationStates = 10_000;
    input.profile.activeMinutes = 100_000;

    const result = planProduction(input);
    const optimized = result.ranked.find((plan) => plan.scenario === 'optimized');

    expect(optimized).toBeDefined();
    expect(optimized).toMatchObject({
      profit: '64600',
      seconds: 1,
      sourceChoices: Object.fromEntries(
        topology.rootIngredientItemIds.map((itemId) => [itemId, 'buy']),
      ),
      issues: [],
    });
    expect(optimized?.profitPerHour).not.toBeNull();
    expect(optimized?.assumptions.join(' ')).toMatch(
      /\d+ visitados, [1-9]\d* estados podados pelo limite superior seguro/,
    );
    expect(result.incomplete.some((plan) => plan.scenario === 'optimized')).toBe(false);
  });

  it('requires explicit gathering yield and time when gathering is selected', () => {
    const input = fixture();
    input.customChoices = { 2: 'gather' };

    const result = row(input, 'custom');

    expect(result.profit).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toContain('missing-yield');
    expect(result.issues.map((issue) => issue.code)).toContain('missing-time');
  });

  it('does not add an automatic scenario when the candidate has no optimization request', () => {
    const result = planProduction(fixture());

    expect(result.ranked.map((plan) => plan.scenario).sort()).toEqual(
      ['buy-all', 'produce-all', 'custom'].sort(),
    );
  });

  it('includes intermediate processing time and ranks economic profit per hour', () => {
    const result = planProduction(fixture());
    expect(result.best?.scenario).toBe('buy-all');
    expect(row(fixture(), 'buy-all')).toMatchObject({
      cashCost: '60',
      economicCost: '60',
      netRevenue: '130',
      profit: '70',
      profitPerHour: '4200',
      seconds: 60,
    });
    expect(row(fixture(), 'produce-all')).toMatchObject({
      cashCost: '40',
      profit: '90',
      seconds: 120,
      profitPerHour: '2700',
    });
  });

  it('buys all in the buy scenario and values reserved stock once across duplicate branches', () => {
    const input = fixture();
    input.recipes[0].ingredients = [
      { itemId: 1, quantity: 2 },
      { itemId: 1, quantity: 2 },
    ];
    input.inventory = [{ itemId: 1, quantity: 4, reserved: 1 }];
    input.useOwnedInProduction = true;
    expect(row(input, 'buy-all')).toMatchObject({ cashCost: '40', economicCost: '40' });
    expect(row(input, 'produce-all')).toMatchObject({ cashCost: '10', economicCost: '40' });
    expect(row(input, 'produce-all').materials).toEqual([
      { itemId: 1, bought: 1, owned: 3, produced: 0, required: 4, substituted: 0 },
    ]);
  });

  it('keeps silver exact above Number.MAX_SAFE_INTEGER and applies value pack', () => {
    const input = fixture();
    input.quotes[3].unitPrice = '9007199254740993';
    input.tax.valuePack = true;
    expect(row(input, 'buy-all').netRevenue).toBe('7611083370256139');
    expect(row(input, 'buy-all').profit).toBe('7611083370256079');
  });

  it('does not invent expected yield for variable or missing catalog output', () => {
    const input = fixture();
    input.recipes[0].output.quantity = { min: 1, max: 4 };
    expect(row(input, 'buy-all')).toMatchObject({ profitPerHour: null, profit: null });
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('missing-yield');
    input.estimates.final.expectedYield = 2.5;
    expect(row(input, 'buy-all').netRevenue).toBe('325');
    input.estimates.final.expectedYield = 0;
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('missing-yield');
  });

  it('blocks recursive cycles, absent time and stale calibrated contexts', () => {
    const cycle = fixture();
    cycle.recipes[1].ingredients = [{ itemId: 2, quantity: 1 }];
    expect(row(cycle, 'produce-all').issues.map((i) => i.code)).toContain('cycle');
    const missing = fixture();
    delete missing.estimates.middle.craftSeconds;
    expect(row(missing, 'produce-all').profitPerHour).toBeNull();
    const mismatch = fixture();
    mismatch.estimates.final = { craftSeconds: 10, source: 'calibrated', contextHash: 'old' };
    mismatch.profile.contextHash = 'new';
    expect(row(mismatch, 'buy-all').issues.map((i) => i.code)).toContain('calibration-mismatch');
  });

  it('honors market availability, budget and active time while sizing a batch', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final' }];
    input.quotes[2].available = 6;
    input.profile.budget = '100';
    input.profile.activeMinutes = 2;
    expect(row(input, 'buy-all').crafts).toBe(1);
    expect(row(input, 'produce-all').crafts).toBe(1);
    input.profile.budget = '20';
    expect(planProduction(input).best).toBeNull();
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('budget');
  });

  it('can value a maximum market price without disabling budget or time limits', () => {
    const input = fixture();
    input.quotes[2].available = 0;
    input.enforceMarketAvailability = false;
    input.profile.budget = '0';
    input.profile.activeMinutes = 0;

    const plan = row(input, 'buy-all');

    expect(plan.issues.map((issue) => issue.code)).not.toContain('market-stock');
    expect(plan.issues.map((issue) => issue.code)).toContain('budget');
    expect(plan.issues.map((issue) => issue.code)).toContain('time');
  });

  it('compares economic plans without requiring current market stock or imported silver', () => {
    const input = fixture();
    input.profile.budget = '0';
    input.quotes[2].available = 0;
    input.enforcePurchaseLimits = false;
    const plan = row(input, 'buy-all');
    expect(plan.issues.map((issue) => issue.code)).not.toContain('budget');
    expect(plan.issues.map((issue) => issue.code)).not.toContain('market-stock');
    expect(plan.profitPerHour).not.toBeNull();
    input.quotes[2].available = null;
    expect(row(input, 'buy-all').issues.map((issue) => issue.code)).not.toContain(
      'unknown-availability',
    );
    delete input.quotes[2];
    expect(row(input, 'buy-all').profitPerHour).toBeNull();
  });

  it('handles custom stock-only choices and NPC purchase prices', () => {
    const input = fixture();
    input.customChoices = { 2: 'stock' };
    input.inventory = [{ itemId: 2, quantity: 1 }];
    expect(row(input, 'custom').issues.map((i) => i.code)).toContain('stock-shortage');
    input.customChoices = { 2: 'produce' };
    input.quotes[1] = { unitPrice: '7', available: null, observedAt: now, source: 'npc' };
    expect(row(input, 'custom').cashCost).toBe('28');
  });

  it('uses available owned materials when a custom checkbox selects production', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', crafts: 1 }];
    input.customChoices = { 2: 'produce' };
    input.useOwnedInProduction = true;
    input.inventory = [{ itemId: 2, quantity: 2 }];

    const plan = row(input, 'custom');

    expect(plan.materials.find((material) => material.itemId === 2)).toMatchObject({
      required: 2,
      owned: 2,
      produced: 0,
      bought: 0,
    });
    expect(plan.cashCost).toBe('0');
    expect(plan.economicCost).toBe('60');
  });

  it('counts only explicitly valued byproducts and applies tax to their sale', () => {
    const input = fixture();
    input.recipes[0].byproducts = [{ itemId: 4, quantity: null }];
    expect(row(input, 'buy-all').netRevenue).toBe('130');
    input.byproductValues = {
      final: [{ itemId: 4, expectedQuantity: 0.5, unitPrice: '100', sell: true }],
    };
    expect(row(input, 'buy-all').netRevenue).toBe('162');
  });

  it('uses selected rare cooking procs as three base-item equivalents and does not sell consumed procs', () => {
    const input = fixture();
    input.recipes = [
      {
        id: 'final',
        name: 'Final',
        method: 'cook',
        output: { itemId: 3, quantity: 1 },
        ingredients: [{ itemId: 2, quantity: 4 }],
      },
      {
        id: 'middle',
        name: 'Middle',
        method: 'cook',
        output: { itemId: 2, quantity: 2 },
        ingredients: [{ itemId: 1, quantity: 1 }],
        byproducts: [{ itemId: 9, quantity: null }],
        rareSubstitution: { itemId: 9, ratio: 3 },
      },
    ];
    input.estimates = {
      final: { craftSeconds: 60, source: 'fixed' },
      middle: { expectedYield: 2, craftSeconds: 1, source: 'informed' },
    };
    input.byproductValues = {
      middle: [{ itemId: 9, expectedQuantity: 1, unitPrice: '1000', sell: true }],
    };

    const withoutRareProcs = row(input, 'produce-all');
    input.useRareProcs = { middle: true };
    const withRareProcs = row(input, 'produce-all');

    expect(withoutRareProcs.steps.find((step) => step.recipeId === 'middle')?.crafts).toBe(2);
    expect(withoutRareProcs.seconds).toBe(62);
    expect(withRareProcs.steps.find((step) => step.recipeId === 'middle')?.crafts).toBe(1);
    expect(withRareProcs.returns).toContainEqual({ itemId: 9, quantity: 0.333333, sell: true });
    expect(withRareProcs.materials.find((material) => material.itemId === 2)?.substituted).toBe(
      2.000001,
    );
    expect(BigInt(withRareProcs.profit!)).toBeLessThan(BigInt(withRareProcs.netRevenue!));
    expect(withRareProcs.seconds).toBe(61);
  });

  it('limits each rare proc to the number of matching dishes required by one recipe action', () => {
    const input = fixture();
    input.recipes = [
      {
        id: 'final',
        name: 'Final',
        method: 'cook',
        output: { itemId: 3, quantity: 1 },
        ingredients: [{ itemId: 2, quantity: 2 }],
      },
      {
        id: 'middle',
        name: 'Middle',
        method: 'cook',
        output: { itemId: 2, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 1 }],
        byproducts: [{ itemId: 9, quantity: null }],
        rareSubstitution: { itemId: 9, ratio: 3 },
      },
    ];
    input.estimates = {
      final: { craftSeconds: 60, source: 'fixed' },
      middle: { expectedYield: 1, craftSeconds: 1, source: 'informed' },
    };
    input.byproductValues = {
      middle: [{ itemId: 9, expectedQuantity: 1, unitPrice: '1000', sell: true }],
    };
    input.useRareProcs = { middle: true };

    const plan = row(input, 'produce-all');

    expect(plan.steps.find((step) => step.recipeId === 'middle')?.crafts).toBe(1);
    expect(plan.returns).toContainEqual({ itemId: 9, quantity: 0.5, sell: true });
    expect(plan.materials.find((material) => material.itemId === 2)?.substituted).toBe(1);
  });

  it('values leftover intermediate output only when its item is marked to sell', () => {
    const input = fixture();
    input.estimates.middle.expectedYield = 3;
    input.surplusSales = { 2: true };

    const sold = row(input, 'produce-all');

    expect(sold.returns).toEqual([{ itemId: 2, quantity: 1, sell: true }]);
    expect(sold.grossRevenue).toBe('230');
    expect(sold.netRevenue).toBe('149');

    input.surplusSales[2] = false;
    const kept = row(input, 'produce-all');
    expect(kept.returns).toEqual([{ itemId: 2, quantity: 1, sell: false }]);
    expect(kept.grossRevenue).toBe('200');
    expect(kept.netRevenue).toBe('130');
  });

  it('reuses intermediate surplus and limits initial material weight', () => {
    const input = fixture();
    input.recipes[0].ingredients = [
      { itemId: 2, quantity: 1 },
      { itemId: 2, quantity: 1 },
    ];
    input.recipes[1].output.quantity = 2;
    expect(row(input, 'produce-all')).toMatchObject({ cashCost: '20', seconds: 90 });
    input.itemWeights = { 1: 1, 2: 2, 3: 3 };
    input.profile.maxWeight = 3;
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('weight');
  });

  it('separates incomplete data and preserves negative but valid rankings', () => {
    const input = fixture();
    input.quotes[3].unitPrice = '1';
    expect(planProduction(input).best?.profitPerHour).toBe('-1200');
    delete input.quotes[1];
    const result = planProduction(input);
    expect(result.ranked.map((r) => r.scenario)).toEqual(['buy-all', 'custom']);
    expect(result.incomplete[0].profitPerHour).toBeNull();
    input.quotes[2].observedAt = '2026-10-09T10:00:00Z';
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('stale-quote');
  });

  it('does not buy more units than the exact shared market offer', () => {
    const input = fixture();
    input.recipes[0].ingredients = [
      { itemId: 1, quantity: 2 },
      { itemId: 1, quantity: 2 },
    ];
    input.quotes[1].available = 3;
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('market-stock');
    input.quotes[1].available = null;
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('unknown-availability');
  });

  it('rejects quantities too small to represent rather than making ingredients free', () => {
    const input = fixture();
    input.recipes[0].ingredients[0].quantity = 0.00000001;
    expect(row(input, 'buy-all').profitPerHour).toBeNull();
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('missing-quantity');
  });

  it('includes known byproduct quantities in the weight limit even without selling them', () => {
    const input = fixture();
    input.recipes[0].byproducts = [{ itemId: 4, quantity: 2 }];
    input.itemWeights = { 1: 0, 2: 0, 3: 1, 4: 2 };
    input.profile.maxWeight = 4;
    expect(row(input, 'buy-all').issues.map((i) => i.code)).toContain('weight');
  });

  it('chooses a smaller batch when intermediate yield rounding improves profit per hour', () => {
    const input = fixture();
    input.recipes[0].ingredients = [{ itemId: 2, quantity: 1 }];
    input.recipes[1].ingredients = [{ itemId: 1, quantity: 1 }];
    input.recipes[1].output.quantity = 2;
    input.quotes[3].unitPrice = '100';
    input.estimates.final.craftSeconds = 10;
    input.estimates.middle.craftSeconds = 10;
    input.candidates = [{ recipeId: 'final' }];
    input.maxCrafts = 3;
    expect(row(input, 'produce-all')).toMatchObject({
      crafts: 2,
      profit: '120',
      seconds: 30,
      profitPerHour: '14400',
    });
  });

  it('breaks equal rates in favor of the larger feasible production lot', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final' }];
    input.maxCrafts = 4;
    expect(row(input, 'buy-all').crafts).toBe(4);
  });
});
