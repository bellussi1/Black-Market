import { describe, expect, it } from 'vitest';

import { deriveRecipeMarketEquivalents } from './recipe-market-equivalents';

describe('recipe market equivalents', () => {
  it('derives a marketable dried-fish input from the catalog drying relation', () => {
    const equivalents = deriveRecipeMarketEquivalents(
      [
        {
          id: 8201,
          category: 'Fish',
          sourceData: { forTrade: true, marketable: false },
        },
      ],
      [
        {
          type: 'DRY',
          inputs: [{ itemId: 8201 }],
          outputs: [{ itemId: 8501 }],
        },
      ],
      [
        {
          id: 8501,
          name: 'Gobião Desidratado',
          iconUrl: '/market/gobiao.webp',
          category: 'Fish',
          sourceData: { marketable: true },
        },
      ],
    );

    expect(equivalents).toEqual([
      {
        sourceItemId: 8201,
        itemId: 8501,
        name: 'Gobião Desidratado',
        iconUrl: '/market/gobiao.webp',
        quantityRatio: 1,
      },
    ]);
  });

  it('does not infer equivalents from names, non-fish inputs, or nonmarketable outputs', () => {
    const equivalents = deriveRecipeMarketEquivalents(
      [
        { id: 1, category: 'Fish', sourceData: { forTrade: true } },
        { id: 2, category: 'Etc', sourceData: { forTrade: true } },
      ],
      [
        { type: 'DRY', inputs: [{ itemId: 1 }], outputs: [{ itemId: 11 }] },
        { type: 'DRY', inputs: [{ itemId: 2 }], outputs: [{ itemId: 12 }] },
        { type: 'GRIND', inputs: [{ itemId: 1 }], outputs: [{ itemId: 13 }] },
      ],
      [
        { id: 11, name: 'Peixe Seco', iconUrl: null, category: 'Fish', sourceData: {} },
        {
          id: 12,
          name: 'Material Seco',
          iconUrl: null,
          category: 'Fish',
          sourceData: { marketable: true },
        },
        {
          id: 13,
          name: 'Outro Peixe Seco',
          iconUrl: null,
          category: 'Fish',
          sourceData: { marketable: true },
        },
      ],
    );

    expect(equivalents).toEqual([]);
  });
});
