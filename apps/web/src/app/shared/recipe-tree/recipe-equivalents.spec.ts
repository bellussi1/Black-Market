import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { batchAlternatives, ingredientAlternatives, recipeFamilies } from './recipe-equivalents';
const make = (key: string, meat: number, amount = '5', extra = 4): CatalogRecipe => ({
  key,
  type: 'COOK',
  station: null,
  inputs: [
    { itemId: meat, name: 'Carne', quantity: amount },
    { itemId: extra, name: 'Sal', quantity: '1' },
  ],
  outputs: [{ itemId: 10, name: 'Prato', quantity: null }],
});
describe('Ingredient equivalences from actual recipes', () => {
  it('unifies Edania batches while keeping their actual catalysts and Ibellab quantities', () => {
    const recipes: CatalogRecipe[] = [1, 10, 100].map((quantity) => ({
      key: 'edania-' + quantity,
      type: 'SIMPLE_ALCHEMY',
      station: null,
      outputs: [{ itemId: 1407, name: 'Edania', quantity: null }],
      inputs: [
        { itemId: 1399, name: 'Harmonia', quantity: String(quantity) },
        { itemId: 702, name: 'Vontade', quantity: String(quantity * 3) },
        { itemId: 1409, name: 'Elixir', quantity: String(quantity * 3) },
        {
          itemId: quantity === 1 ? 820936 : 821372,
          name: 'Catalisador',
          quantity: quantity === 100 ? '10' : '1',
        },
        ...(quantity === 100 ? [{ itemId: 4986, name: 'Ibellab', quantity: '1' }] : []),
      ],
    }));
    expect(recipeFamilies(recipes)).toHaveLength(1);
    expect(batchAlternatives(recipes[0], recipes).map((batch) => batch.quantity)).toEqual([
      1, 10, 100,
    ]);
  });
  it('unifies wolf and fox meat and keeps unrelated compositions apart', () => {
    const recipes = [make('wolf', 1), make('fox', 2), make('other', 3, '5', 8)];
    expect(recipeFamilies(recipes).map((family) => family.length)).toEqual([2, 1]);
    expect(
      ingredientAlternatives(recipes[0], recipes, recipes[0].inputs[0]).map(
        (choice) => choice.part.itemId,
      ),
    ).toEqual([1, 2]);
  });
  it('retains the substitute quantity and never invents a missing combination', () => {
    const base = make('base', 1, '3'),
      superior = make('superior', 2, '1');
    const other = make('other-salt', 1, '3', 8);
    expect(recipeFamilies([base, superior, other])).toHaveLength(1);
    expect(
      ingredientAlternatives(base, [base, superior, other], base.inputs[0]).map(
        (c) => c.part.quantity,
      ),
    ).toEqual(['3', '1']);
    expect(
      ingredientAlternatives(superior, [base, superior, other], superior.inputs[1]),
    ).toHaveLength(1);
  });
  it('does not merge different processing methods or output items', () => {
    const base = make('base', 1);
    expect(recipeFamilies([base, { ...make('different', 2), type: 'ALCHEMY' }])).toHaveLength(2);
  });
});
