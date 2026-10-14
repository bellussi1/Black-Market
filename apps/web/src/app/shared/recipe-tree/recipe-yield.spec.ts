import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import {
  lifeSkillForRecipe,
  recipeMasteryCanChangeOutput,
  recipeOutputQuantityWithoutMastery,
  resolveDefaultYield,
} from './recipe-yield';

describe('Recipe default yield resolution', () => {
  it('maps recipe types to life skills correctly', () => {
    expect(lifeSkillForRecipe('COOKING')).toBe('cooking');
    expect(lifeSkillForRecipe('COOK')).toBe('cooking');
    expect(lifeSkillForRecipe('ALCHEMY')).toBe('alchemy');
    expect(lifeSkillForRecipe('PROCESSING')).toBe('processing');
    expect(lifeSkillForRecipe('MANUFACTURE')).toBe('processing');
    expect(lifeSkillForRecipe('GRIND')).toBe('processing');
    expect(lifeSkillForRecipe('HEAT')).toBe('processing');
    expect(lifeSkillForRecipe('DRY')).toBe('processing');
    expect(lifeSkillForRecipe('FIREWOOD')).toBe('processing');
    expect(lifeSkillForRecipe('SHAKE')).toBe('processing');
    expect(lifeSkillForRecipe('THINNING')).toBe('processing');
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

  it('uses the recipe batch size for Green Leaf and Edania instead of generic alchemy mastery', () => {
    const greenLeafBatch: CatalogRecipe = {
      key: 'green-leaf-batch',
      type: 'SIMPLE_ALCHEMY',
      station: null,
      inputs: [
        [690, '30'],
        [725, '10'],
        [750, '10'],
        [4925, '10'],
        [4986, '1'],
      ].map(([itemId, quantity]) => ({
        itemId: Number(itemId),
        name: `Item ${itemId}`,
        quantity: String(quantity),
      })),
      outputs: [{ itemId: 791, name: 'Folha Verde', quantity: null }],
    };
    const edaniaBatch: CatalogRecipe = {
      key: 'edania-batch',
      type: 'SIMPLE_ALCHEMY',
      station: null,
      inputs: [
        [702, '30'],
        [1399, '10'],
        [1409, '30'],
        [821372, '1'],
      ].map(([itemId, quantity]) => ({
        itemId: Number(itemId),
        name: `Item ${itemId}`,
        quantity: String(quantity),
      })),
      outputs: [{ itemId: 1407, name: 'Edania', quantity: null }],
    };
    const greenLeafSingle: CatalogRecipe = {
      key: 'green-leaf-single',
      type: 'SIMPLE_ALCHEMY',
      station: null,
      inputs: [767, 768, 4925].map((itemId) => ({
        itemId,
        name: `Item ${itemId}`,
        quantity: '1',
      })),
      outputs: [{ itemId: 791, name: 'Folha Verde', quantity: null }],
    };

    expect(resolveDefaultYield(greenLeafBatch, 791, 3000)).toBe(10);
    expect(resolveDefaultYield(greenLeafSingle, 791, 3000)).toBe(1);
    expect(resolveDefaultYield(edaniaBatch, 1407, 3000)).toBe(10);
  });

  it('recognizes the one and ten unit batches of Edania Party Draught', () => {
    const single: CatalogRecipe = {
      key: 'edania-party-single',
      type: 'SIMPLE_ALCHEMY',
      station: null,
      inputs: [1179, 1407].map((itemId, index) => ({
        itemId,
        name: `Item ${itemId}`,
        quantity: index === 0 ? '6' : '1',
      })),
      outputs: [{ itemId: 1408, name: 'Fármaco da Harmonia - Edania', quantity: null }],
    };
    const batch: CatalogRecipe = {
      ...single,
      key: 'edania-party-batch',
      inputs: [1179, 1407, 4986].map((itemId, index) => ({
        itemId,
        name: `Item ${itemId}`,
        quantity: ['60', '10', '1'][index]!,
      })),
    };

    expect(resolveDefaultYield(single, 1408, 3000)).toBe(1);
    expect(resolveDefaultYield(batch, 1408, 3000)).toBe(10);
  });

  it('uses Organic Feed base yield and cooking mastery proc chance', () => {
    const feed: CatalogRecipe = {
      key: 'organic-feed',
      type: 'COOK',
      station: null,
      inputs: [
        { itemId: 7905, quantity: '5' },
        { itemId: 7921, quantity: '4' },
        { itemId: 8201, quantity: '1' },
        { itemId: 9276, quantity: '1' },
      ].map((part) => ({ ...part, name: `Item ${part.itemId}` })),
      outputs: [{ itemId: 54018, name: 'Ração Orgânica', quantity: null }],
    };

    expect(resolveDefaultYield(feed, 54018, 0)).toBe(4);
    expect(resolveDefaultYield(feed, 54018, 1000)).toBeCloseTo(4.1781);
    expect(resolveDefaultYield(feed, 54018, 3000)).toBeCloseTo(4.7645);
  });

  it('keeps the Organic Feed yield when the verified dried green-fish substitute is selected', () => {
    const feedWithDriedFish: CatalogRecipe = {
      key: 'organic-feed-dried-fish',
      type: 'COOK',
      station: null,
      inputs: [
        { itemId: 7905, quantity: '5' },
        { itemId: 7921, quantity: '4' },
        { itemId: 8501, quantity: '1' },
        { itemId: 9276, quantity: '1' },
      ].map((part) => ({ ...part, name: `Item ${part.itemId}` })),
      outputs: [{ itemId: 54018, name: 'Ração Orgânica', quantity: null }],
    };

    expect(recipeMasteryCanChangeOutput(feedWithDriedFish, 54018)).toBe(true);
    expect(resolveDefaultYield(feedWithDriedFish, 54018, 3000)).toBeCloseTo(4.7645);
  });

  it('keeps the Organic Feed yield when deer meat replaces pork at the same quantity', () => {
    const feedWithDeerMeat: CatalogRecipe = {
      key: 'organic-feed-deer-meat',
      type: 'COOK',
      station: null,
      inputs: [
        { itemId: 7905, name: 'Carne de Porco', quantity: '5' },
        { itemId: 7921, name: 'Frango', quantity: '4' },
        { itemId: 8201, name: 'Gobião', quantity: '1' },
        { itemId: 9276, name: 'Aveia Refinada', quantity: '1' },
      ].map((part) => ({
        ...part,
        ...(part.itemId === 7905 ? { itemId: 7901, name: 'Carne de Veado' } : {}),
      })),
      outputs: [{ itemId: 54018, name: 'Ração Orgânica', quantity: null }],
    };

    expect(resolveDefaultYield(feedWithDeerMeat, 54018, 3000)).toBeCloseTo(4.7645);
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

  it.each([
    ['COOK', 3.647],
    ['ALCHEMY', 3.4375],
  ] as const)(
    'applies mastery to catalog base output quantity 1 for %s recipes',
    (type, expectedYield) => {
      const recipeWithBaseYield: CatalogRecipe = {
        key: `base-${type.toLowerCase()}`,
        type,
        station: null,
        inputs: [],
        outputs: [{ itemId: 9998, name: 'Item', quantity: '1' }],
      };

      expect(recipeMasteryCanChangeOutput(recipeWithBaseYield, 9998)).toBe(true);
      expect(resolveDefaultYield(recipeWithBaseYield, 9998, 3000)).toBeCloseTo(expectedYield);
    },
  );

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
      type: 'GRIND',
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

  it('treats a one-unit processing catalog output as the base average batch', () => {
    const processingRecipe: CatalogRecipe = {
      key: 'wheat-flour',
      type: 'GRIND',
      station: null,
      inputs: [{ itemId: 7001, name: 'Trigo', quantity: '1' }],
      outputs: [{ itemId: 7101, name: 'Farinha de Trigo', quantity: '1' }],
    };

    expect(recipeOutputQuantityWithoutMastery(processingRecipe, 7101)).toBeNull();
    expect(resolveDefaultYield(processingRecipe, 7101, 0)).toBe(2.5);
    expect(resolveDefaultYield(processingRecipe, 7101, 1000)).toBe(212.5);
  });
});
