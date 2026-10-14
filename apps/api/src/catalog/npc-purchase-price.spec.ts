import { describe, expect, it } from 'vitest';

import { npcPurchasePriceFromCatalog } from './npc-purchase-price';

describe('NPC purchase prices in catalog data', () => {
  it('uses a recorded buy price only when the catalog lists NPC vendors', () => {
    expect(
      npcPurchasePriceFromCatalog(
        7313,
        { buyPrice: 1000, vendors: { urns: ['urn::npc:47045'] } },
        '2026-10-10T12:22:17.854Z',
      ),
    ).toEqual({
      itemId: 7313,
      unitPrice: '1000',
      vendor: 'Vendedor NPC listado no catálogo',
      verifiedAt: '2026-10-10T12:22:17.854Z',
    });
  });

  it.each([
    { buyPrice: 1000 },
    { buyPrice: 0, vendors: { urns: ['urn::npc:1'] } },
    { buyPrice: -1, vendors: { urns: ['urn::npc:1'] } },
    { buyPrice: '1.5', vendors: { urns: ['urn::npc:1'] } },
    { buyPrice: Number.MAX_SAFE_INTEGER + 1, vendors: { urns: ['urn::npc:1'] } },
    { buyPrice: 1000, vendors: { urns: [] } },
  ])('ignores unverified NPC price data %#', (sourceData) => {
    expect(npcPurchasePriceFromCatalog(7313, sourceData, '2026-10-10T12:00:00Z')).toBeNull();
  });
});
