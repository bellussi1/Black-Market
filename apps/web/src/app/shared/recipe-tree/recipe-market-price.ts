import type { MarketItemQuote } from '@bdo/shared';

export type RecipeMarketPriceSource = 'market' | 'maximum';

function validPrice(value: string | null): value is string {
  return value !== null && /^\d{1,24}$/.test(value) && BigInt(value) > 0n;
}

/** Selects the current market quote when listed, otherwise the market's maximum price. */
export function recipeMarketPrice(
  quote: Pick<MarketItemQuote, 'price' | 'stock' | 'maxPrice'>,
): { price: string; source: RecipeMarketPriceSource } | null {
  if (quote.stock > 0 && validPrice(quote.price)) return { price: quote.price, source: 'market' };
  if (validPrice(quote.maxPrice)) return { price: quote.maxPrice, source: 'maximum' };
  return null;
}
