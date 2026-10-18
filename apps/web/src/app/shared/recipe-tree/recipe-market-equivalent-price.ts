import type { MarketItemQuote, NpcPurchasePrice } from '@bdo/shared';

import { recipeMarketPrice, type RecipeMarketPriceSource } from './recipe-market-price';

export interface RecipeMarketEquivalent {
  itemId: number;
  name: string;
  iconUrl: string | null;
  quantityRatio: number;
}

export type RecipeMaterialPrice = {
  price: string;
  source: RecipeMarketPriceSource | 'npc' | 'equivalent';
  equivalentItem?: RecipeMarketEquivalent;
  equivalentPriceSource?: RecipeMarketPriceSource;
};

export function resolveRecipeMaterialPrice(
  itemId: number,
  quotes: ReadonlyMap<number, MarketItemQuote>,
  npcPrices: ReadonlyMap<number, NpcPurchasePrice>,
  equivalents: ReadonlyMap<number, readonly RecipeMarketEquivalent[]>,
): RecipeMaterialPrice | null {
  const directMarketPrice = quotes.get(itemId);
  const directMarket = directMarketPrice ? recipeMarketPrice(directMarketPrice) : null;
  if (directMarket) return directMarket;

  const npcPrice = npcPrices.get(itemId)?.unitPrice;
  if (npcPrice && /^\d{1,24}$/.test(npcPrice) && BigInt(npcPrice) > 0n)
    return { price: npcPrice, source: 'npc' };

  const candidates = (equivalents.get(itemId) ?? [])
    .filter(
      (candidate) => Number.isSafeInteger(candidate.quantityRatio) && candidate.quantityRatio > 0,
    )
    .flatMap((candidate) => {
      const quote = quotes.get(candidate.itemId);
      const marketPrice = quote ? recipeMarketPrice(quote) : null;
      return marketPrice
        ? [
            {
              price: (BigInt(marketPrice.price) * BigInt(candidate.quantityRatio)).toString(),
              source: 'equivalent' as const,
              equivalentPriceSource: marketPrice.source,
              equivalentItem: candidate,
            },
          ]
        : [];
    })
    .sort((left, right) => {
      const a = BigInt(left.price);
      const b = BigInt(right.price);
      return a < b ? -1 : a > b ? 1 : left.equivalentItem.itemId - right.equivalentItem.itemId;
    });

  return candidates[0] ?? null;
}
