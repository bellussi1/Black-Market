import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import {
  batchAlternatives,
  ingredientAlternatives,
  preferMarketIngredientRecipe,
  recipeFamilies,
  verifiedIngredientSubstitutionItemIds,
  withVerifiedIngredientSubstitutions,
} from './recipe-equivalents';
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
  it('offers real dried market SKUs for fish and seafood cooking, preserving the fresh option', () => {
    const fresh = make('seafood', 8211, '1');
    const expanded = withVerifiedIngredientSubstitutions([fresh]);
    expect(
      ingredientAlternatives(fresh, expanded, fresh.inputs[0]).map(({ part }) => [
        part.itemId,
        part.quantity,
      ]),
    ).toEqual([
      [8211, '1'],
      [8511, '1'],
      [8515, '1'],
    ]);
    expect(fresh.inputs[0].itemId).toBe(8211);
    expect(verifiedIngredientSubstitutionItemIds([fresh])).toEqual([8511, 8515]);
    expect(withVerifiedIngredientSubstitutions(expanded)).toEqual(expanded);
    expect(preferMarketIngredientRecipe(fresh, expanded).inputs[0].itemId).toBe(8511);
    expect(recipeFamilies(expanded)[0][0].inputs[0].itemId).toBe(8511);
    const fish = make('fish', 8201, '1');
    expect(
      withVerifiedIngredientSubstitutions([fish]).some((r) => r.inputs[0].itemId === 8501),
    ).toBe(true);
    expect(withVerifiedIngredientSubstitutions([{ ...fresh, type: 'DRY' }])).toHaveLength(1);
    expect(withVerifiedIngredientSubstitutions([make('lobster', 6511)])).toHaveLength(1);
    const databaseQuantity = make('database-quantity', 8211, '1.0000');
    expect(
      preferMarketIngredientRecipe(
        databaseQuantity,
        withVerifiedIngredientSubstitutions([databaseQuantity]),
      ).inputs[0],
    ).toMatchObject({ itemId: 8511, quantity: '1.0000' });
    expect(withVerifiedIngredientSubstitutions([make('unknown', 8211, '1.5')])).toHaveLength(1);
    expect(
      withVerifiedIngredientSubstitutions([make('unreviewed-quantity', 8211, '3')]),
    ).toHaveLength(1);
  });
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
    expect(recipeFamilies(recipes)[0]?.[0]?.key).toBe('edania-100');
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

  it('prefers a normal cooking ingredient over a rare proc sold as a separate item', () => {
    const specialIngredient: CatalogRecipe = {
      ...make('a-special-first', 9305),
      inputs: [
        { itemId: 9305, name: 'Cuscuz Clássico', quantity: '1' },
        { itemId: 9218, name: 'Sanduíche Teff', quantity: '1' },
      ],
    };
    const normalIngredient: CatalogRecipe = {
      ...make('z-normal', 9220),
      inputs: [
        { itemId: 9220, name: 'Cuscuz', quantity: '1' },
        { itemId: 9218, name: 'Sanduíche Teff', quantity: '1' },
      ],
    };
    specialIngredient.outputs = [{ itemId: 9609, name: 'Refeição de Valência', quantity: null }];
    normalIngredient.outputs = [{ itemId: 9609, name: 'Refeição de Valência', quantity: null }];

    expect(recipeFamilies([specialIngredient, normalIngredient])[0]?.[0]?.key).toBe('z-normal');
  });

  it('offers the market-priced dried green fish equivalent for Organic Feed', () => {
    const organicFeed: CatalogRecipe = {
      key: 'organic-feed',
      type: 'COOK',
      station: null,
      inputs: [
        { itemId: 9261, name: 'Aveia', quantity: '2' },
        { itemId: 7905, name: 'Carne de Porco', quantity: '5' },
        { itemId: 8201, name: 'Gobião', quantity: '1' },
        { itemId: 7921, name: 'Frango', quantity: '4' },
      ],
      outputs: [{ itemId: 54018, name: 'Ração Orgânica', quantity: null }],
    };
    const expanded = withVerifiedIngredientSubstitutions([organicFeed]);
    const fish = organicFeed.inputs[2]!;

    expect(expanded).toHaveLength(4);
    expect(verifiedIngredientSubstitutionItemIds(expanded)).toEqual([7901, 8501]);
    expect(
      ingredientAlternatives(organicFeed, expanded, fish).map(({ part }) => ({
        itemId: part.itemId,
        quantity: part.quantity,
        name: part.name,
      })),
    ).toEqual([
      { itemId: 8201, quantity: '1', name: 'Gobião' },
      { itemId: 8501, quantity: '1', name: 'Gobião Desidratado' },
    ]);
  });

  it('offers the deer-meat equivalent used in the Organic Feed comparison at the same ratio', () => {
    const organicFeed: CatalogRecipe = {
      key: 'organic-feed',
      type: 'COOK',
      station: null,
      inputs: [
        { itemId: 9261, name: 'Aveia', quantity: '2' },
        { itemId: 7905, name: 'Carne de Porco', quantity: '5' },
        { itemId: 8201, name: 'Gobião', quantity: '1' },
        { itemId: 7921, name: 'Frango', quantity: '4' },
      ],
      outputs: [{ itemId: 54018, name: 'Ração Orgânica', quantity: null }],
    };
    const expanded = withVerifiedIngredientSubstitutions([organicFeed]);
    const meat = organicFeed.inputs[1]!;

    expect(verifiedIngredientSubstitutionItemIds(expanded)).toContain(7901);
    expect(
      ingredientAlternatives(organicFeed, expanded, meat).map(({ part }) => ({
        itemId: part.itemId,
        quantity: part.quantity,
        name: part.name,
      })),
    ).toContainEqual({ itemId: 7901, quantity: '5', name: 'Carne de Veado' });
  });
});
