import type { MarketItemQuote, NpcPurchasePrice } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { resolveRecipeMaterialPrice } from './recipe-market-equivalent-price';

const quote = (
  itemId: number,
  price: string,
  stock = 10,
  maxPrice: string | null = price,
): MarketItemQuote => ({
  itemId,
  subId: 0,
  name: `Item ${itemId}`,
  price,
  stock,
  totalTrades: '10',
  minPrice: price,
  maxPrice,
  lastSoldPrice: price,
  lastSoldAt: null,
});

describe('resolveRecipeMaterialPrice', () => {
  it('uses a priced dried-fish equivalent when the required fresh fish has no quote', () => {
    const result = resolveRecipeMaterialPrice(
      8201,
      new Map([[8501, quote(8501, '26400', 0, '30900')]]),
      new Map(),
      new Map([
        [
          8201,
          [{ itemId: 8501, name: 'Gobião Desidratado', iconUrl: '/gobiao.webp', quantityRatio: 1 }],
        ],
      ]),
    );

    expect(result).toEqual({
      price: '30900',
      source: 'equivalent',
      equivalentPriceSource: 'maximum',
      equivalentItem: {
        itemId: 8501,
        name: 'Gobião Desidratado',
        iconUrl: '/gobiao.webp',
        quantityRatio: 1,
      },
    });
  });

  it('keeps an available direct quote or NPC price ahead of an equivalent', () => {
    const equivalent = new Map([
      [8201, [{ itemId: 8501, name: 'Gobião Desidratado', iconUrl: null, quantityRatio: 1 }]],
    ]);
    const npc = new Map<number, NpcPurchasePrice>([
      [8201, { itemId: 8201, unitPrice: '40', vendor: 'NPC', verifiedAt: '2026-10-13T00:00:00Z' }],
    ]);

    expect(
      resolveRecipeMaterialPrice(8201, new Map([[8201, quote(8201, '30')]]), npc, equivalent),
    ).toMatchObject({ price: '30', source: 'market' });
    expect(resolveRecipeMaterialPrice(8201, new Map(), npc, equivalent)).toMatchObject({
      price: '40',
      source: 'npc',
    });
  });
});
