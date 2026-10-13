import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { lifeSkillForRecipe, resolveDefaultYield } from './recipe-yield';

describe('Recipe default yield resolution', () => {
  it('maps recipe types to life skills correctly', () => {
    expect(lifeSkillForRecipe('COOKING')).toBe('cooking');
    expect(lifeSkillForRecipe('COOK')).toBe('cooking');
    expect(lifeSkillForRecipe('ALCHEMY')).toBe('alchemy');
    expect(lifeSkillForRecipe('PROCESSING')).toBe('processing');
    expect(lifeSkillForRecipe('MANUFACTURE')).toBe('processing');
    expect(lifeSkillForRecipe('SIMPLE_ALCHEMY')).toBeNull();
    expect(lifeSkillForRecipe('CRAFT')).toBeNull();
  });

  it('uses fixed yields for Simple Alchemy draughts and Harmony', () => {
    const harmonyRecipe: CatalogRecipe = {
      key: 'harmony',
      type: 'SIMPLE_ALCHEMY',
      station: null,
      inputs: [1389, 1391, 1393, 1395, 1397].map((itemId) => ({
        itemId,
        name: 'Item ' + itemId,
        quantity: '10',
      })),
      outputs: [{ itemId: 1399, name: 'Fármaco da Harmonia', quantity: null }],
    };
    expect(resolveDefaultYield(harmonyRecipe, 1399)).toBe(10);
  });

  it('uses explicit output quantity if catalog specifies it', () => {
    const recipeWithQty: CatalogRecipe = {
      key: 'test',
      type: 'COOKING',
      station: null,
      inputs: [],
      outputs: [{ itemId: 9999, name: 'Item', quantity: '5' }],
    };
    expect(resolveDefaultYield(recipeWithQty, 9999)).toBe(5);
  });

  it('defaults cooking and alchemy to 2.50 with zero mastery and scales with mastery', () => {
    const cookingRecipe: CatalogRecipe = {
      key: 'beer',
      type: 'COOKING',
      station: null,
      inputs: [],
      outputs: [{ itemId: 9001, name: 'Cerveja', quantity: null }],
    };
    expect(resolveDefaultYield(cookingRecipe, 9001, 0)).toBe(2.5);
    expect(resolveDefaultYield(cookingRecipe, 9001, 1000)).toBeCloseTo(2.767);
    expect(resolveDefaultYield(cookingRecipe, 9001, 2000)).toBeCloseTo(3.417);
    expect(resolveDefaultYield(cookingRecipe, 9001, 3000)).toBeCloseTo(3.647);
    expect(resolveDefaultYield(cookingRecipe, 9001, 1049)).toBeCloseTo(2.767);
    expect(resolveDefaultYield({ ...cookingRecipe, type: 'ALCHEMY' }, 9001, 1000)).toBeCloseTo(
      2.829,
    );
    expect(resolveDefaultYield({ ...cookingRecipe, type: 'ALCHEMY' }, 9001, 3000)).toBeCloseTo(
      3.438,
    );
  });

  it('applies processing material-count brackets to known-input recipes', () => {
    const procRecipe: CatalogRecipe = {
      key: 'flour',
      type: 'PROCESSING',
      station: null,
      inputs: [{ itemId: 9001, name: 'Trigo', quantity: '1' }],
      outputs: [{ itemId: 1, name: 'Farinha', quantity: null }],
    };
    expect(resolveDefaultYield(procRecipe, 1)).toBe(2.5);
    expect(resolveDefaultYield(procRecipe, 1, 1000)).toBe(212.5);
    expect(resolveDefaultYield(procRecipe, 1, 3000)).toBe(787.5);
    expect(resolveDefaultYield({ ...procRecipe, inputs: [] }, 1, 3000)).toBe(2.5);

    const genericRecipe: CatalogRecipe = {
      key: 'craft',
      type: 'CRAFT',
      station: null,
      inputs: [],
      outputs: [{ itemId: 2, name: 'Item', quantity: null }],
    };
    expect(resolveDefaultYield(genericRecipe, 2)).toBe(1);
    expect(resolveDefaultYield(null, 2)).toBe(1);
  });
});
