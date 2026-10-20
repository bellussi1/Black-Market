import type { ProductionPlan, ProductionRecipe } from '@bdo/calculators';
import { describe, expect, it } from 'vitest';

import {
  buildRecipeChainIndex,
  compareRecipeChain,
  relatedRecipeIds,
} from './recipe-chain-comparison';

const recipe = (id: string, output: number, inputs: number[]): ProductionRecipe => ({
  id,
  name: id,
  method: 'ALCHEMY',
  output: { itemId: output, quantity: 1 },
  ingredients: inputs.map((itemId) => ({ itemId, quantity: 1 })),
});
const plan = (recipeId: string, profit = '100', milliseconds = '60000'): ProductionPlan => ({
  recipeId,
  name: recipeId,
  scenario: 'buy-all',
  crafts: 1,
  output: 1,
  seconds: 60,
  durationMilliseconds: milliseconds,
  cashCost: '10',
  economicCost: '10',
  grossRevenue: '110',
  netRevenue: '110',
  profit,
  profitPerHour: '6000',
  peakWeight: 1,
  issues: [],
  assumptions: [],
  materials: [],
  returns: [],
  steps: [],
});

describe('independent sale comparison along a recipe chain', () => {
  it('includes three recursive levels and every producer alternative without loops or duplicates', () => {
    const index = buildRecipeChainIndex([
      recipe('final', 10, [20]),
      recipe('middle', 20, [30]),
      recipe('middle-alternative', 20, [40]),
      recipe('deep', 30, [40]),
      recipe('deeper', 40, [1, 10]),
      recipe('unrelated', 99, [1]),
    ]);
    expect([...relatedRecipeIds(index, ['final'])].sort()).toEqual([
      'deep',
      'deeper',
      'final',
      'middle',
      'middle-alternative',
    ]);
    const rows = compareRecipeChain(
      index,
      plan('final'),
      [
        plan('final'),
        plan('middle'),
        plan('middle-alternative', '200'),
        plan('deep'),
        plan('deeper'),
      ],
      [],
    );
    expect(rows.map((row) => [row.itemId, row.depth])).toEqual([
      [10, 0],
      [20, 1],
      [30, 2],
      [40, 2],
    ]);
    expect(rows[1].plan?.recipeId).toBe('middle-alternative');
    expect(rows[1].betterThanFinal).toBe(true);
  });

  it('keeps the full depth when a chain has no shortcut', () => {
    const index = buildRecipeChainIndex([
      recipe('final', 10, [20]),
      recipe('middle', 20, [30]),
      recipe('deep', 30, [40]),
      recipe('deeper', 40, [1]),
    ]);
    expect(compareRecipeChain(index, plan('final'), [], []).map((row) => row.depth)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('shows missing sale data as pending instead of assigning a zero rate', () => {
    const index = buildRecipeChainIndex([recipe('final', 10, [20]), recipe('middle', 20, [1])]);
    const pending = {
      ...plan('middle'),
      profit: null,
      profitPerHour: null,
      issues: [{ code: 'missing-quote' as const, itemId: 20, message: 'Preço de venda ausente' }],
    };
    const rows = compareRecipeChain(index, plan('final'), [], [pending]);
    expect(rows[1].plan?.profitPerHour).toBeNull();
    expect(rows[1].plan?.issues[0].code).toBe('missing-quote');
    expect(rows[1].betterThanFinal).toBe(false);
  });

  it('compares exact rates rather than rounded hourly labels or numeric silver', () => {
    const index = buildRecipeChainIndex([recipe('final', 10, [20]), recipe('middle', 20, [1])]);
    const root = plan('final', '9007199254740993', '60000');
    const rows = compareRecipeChain(index, root, [plan('middle', '9007199254740994', '60000')], []);
    expect(rows[1].betterThanFinal).toBe(true);
    expect(
      compareRecipeChain(index, root, [plan('middle', root.profit!, '60000')], [])[1]
        .betterThanFinal,
    ).toBe(false);
  });
});
