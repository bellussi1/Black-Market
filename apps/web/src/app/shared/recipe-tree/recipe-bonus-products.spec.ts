import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { recipeReturnProductItemIds } from './recipe-bonus-products';

describe('recipe return products', () => {
  it('includes every market quote needed for alchemy returns', () => {
    const alchemy: CatalogRecipe = {
      key: 'alchemy',
      type: 'ALCHEMY',
      station: null,
      inputs: [],
      outputs: [{ itemId: 791, name: 'Fármaco da Folha Verde', quantity: null }],
    };

    expect(recipeReturnProductItemIds([alchemy])).toEqual([
      4076, 4481, 4684, 4924, 4998, 5019, 5301, 5302, 5304, 5306, 5964, 6183, 6601, 6602, 6603,
      6604, 6605, 16001, 16080, 44195, 44336, 45216, 45248, 45280, 721002, 721003, 766107, 820910,
    ]);
  });

  it('does not request alchemy returns for cooking recipes', () => {
    const cooking: CatalogRecipe = {
      key: 'cooking',
      type: 'COOK',
      station: null,
      inputs: [],
      outputs: [{ itemId: 9609, name: 'Refeição de Valência', quantity: null }],
    };

    expect(recipeReturnProductItemIds([cooking])).toEqual([9065, 9610]);
  });

  it('loads the quote IDs for cooking rare procs across the Valencia chain', () => {
    const recipes: CatalogRecipe[] = [
      [9202, 'Vegetais em Conserva'],
      [9261, 'Aveia'],
      [9214, 'Pão de Teff'],
      [9215, 'Ensopado de Cobra'],
      [9216, 'Torta de Figo'],
      [9218, 'Sanduíche Teff'],
      [9219, 'Vinho de Tamareira'],
      [9220, 'Cuscuz'],
      [9461, 'Escorpião Grelhado'],
      [9463, 'Hambúrguer do Rei da Selva'],
      [9609, 'Refeição de Valência'],
    ].map(([itemId, name]) => ({
      key: `cook-${itemId}`,
      type: 'COOK',
      station: null,
      inputs: [],
      outputs: [{ itemId: Number(itemId), name: String(name), quantity: null }],
    }));

    expect(recipeReturnProductItemIds(recipes)).toEqual([
      9065, 9276, 9281, 9299, 9300, 9301, 9303, 9304, 9305, 9462, 9464, 9610,
    ]);
  });
});
