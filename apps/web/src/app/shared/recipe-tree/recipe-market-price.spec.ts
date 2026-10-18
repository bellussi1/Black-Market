import { describe, expect, it } from 'vitest';

import { recipeMarketPrice } from './recipe-market-price';

describe('recipe market price selection', () => {
  it('uses the quoted base price as a reference when sold out and no maximum is supplied', () => {
    expect(recipeMarketPrice({ price: '14000', stock: 0, maxPrice: null })).toEqual({
      price: '14000',
      source: 'reference',
    });
  });

  it('prefers the maximum for sold-out items when supplied and rejects unknown prices', () => {
    expect(recipeMarketPrice({ price: '14000', stock: 0, maxPrice: '15000' })).toEqual({
      price: '15000',
      source: 'maximum',
    });
    expect(recipeMarketPrice({ price: null, stock: 0, maxPrice: null })).toBeNull();
    expect(recipeMarketPrice({ price: '0', stock: 0, maxPrice: null })).toBeNull();
  });
});
