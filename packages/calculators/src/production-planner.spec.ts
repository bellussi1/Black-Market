import { describe, expect, it } from 'vitest';

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
      { itemId: 2, required: 1, bought: 1, owned: 0, produced: 0 },
      { itemId: 4, required: 1, bought: 0, owned: 0, produced: 1 },
      { itemId: 5, required: 1, bought: 1, owned: 0, produced: 0 },
    ]);
    expect(optimized?.sourceChoices).toEqual({ 2: 'buy', 4: 'produce', 5: 'buy' });
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

  it('returns an explicit pending result when the route search exceeds its state limit', () => {
    const input = fixture();
    input.candidates = [{ recipeId: 'final', optimizeCrafts: 1 }];
    input.maxOptimizationStates = 1;

    const result = planProduction(input);

    expect(result.ranked.some((plan) => plan.scenario === 'optimized')).toBe(false);
    expect(result.incomplete.find((plan) => plan.scenario === 'optimized')?.issues).toContainEqual(
      expect.objectContaining({ code: 'optimization-limit' }),
    );
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
  });

  it('matches an exhaustive oracle for a small buy-produce graph', () => {
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
      },
      {
        id: 'middle-a',
        name: 'Meio A',
        method: 'processing',
        output: { itemId: 2, quantity: 1 },
        ingredients: [{ itemId: 1, quantity: 2 }],
      },
      {
        id: 'middle-b',
        name: 'Meio B',
        method: 'processing',
        output: { itemId: 4, quantity: 1 },
        ingredients: [{ itemId: 5, quantity: 1 }],
      },
    ];
    input.quotes = Object.fromEntries(
      [1, 2, 3, 4, 5].map((itemId) => [
        itemId,
        {
          unitPrice: String(itemId === 3 ? 1000 : itemId * 10),
          available: 100,
          observedAt: now,
          source: 'market',
        },
      ]),
    );
    input.estimates = {
      final: { craftSeconds: 5, source: 'fixed' },
      'middle-a': { craftSeconds: 12, source: 'fixed' },
      'middle-b': { craftSeconds: 2, source: 'fixed' },
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
      { itemId: 1, bought: 1, owned: 3, produced: 0, required: 4 },
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
