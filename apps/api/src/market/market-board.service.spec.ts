import type { CatalogItem } from '@bdo/shared';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogService } from '../catalog/catalog.service';
import type { DatabaseService } from '../database/database.service';
import { MarketBoardService } from './market-board.service';
import { MarketHistoryService } from './market-history.service';

const hot = Array.from({ length: 55 }, (_, index) => ({
  id: index + 1,
  sid: 0,
  name: index === 53 ? 'Pedra de Armadura' : `Item ${index + 1}`,
  basePrice: String(100 + index),
  currentStock: index,
  totalTrades: String(1000 + index),
  priceMin: 50,
  priceMax: 500,
  lastSoldPrice: 100,
  lastSoldTime: 1791547200,
  minEnhance: 0,
  maxEnhance: 0,
  priceChangeDirection: 0,
  priceChangeValue: 0,
}));

function fixture(enabled = true) {
  const inserted: unknown[] = [];
  const metadata = hot.map((item) => ({
    itemId: item.id,
    name: item.name,
    id: item.id === 54 ? 'armor' : 'materials',
    parentId: null,
    sortOrder: 1,
    categoryName: item.id === 54 ? 'Armaduras' : 'Materiais',
  }));
  const database = {
    db: {
      select: (selection: Record<string, unknown>) => {
        const rows =
          'payload' in selection
            ? []
            : 'sourceData' in selection
              ? [
                  ...Array.from({ length: 1700 }, (_, index) => ({
                    itemId: index + 1,
                    category: 'Etc',
                    sourceData: { maxEnhance: 0 },
                  })),
                  { itemId: 5301, category: 'Etc', sourceData: { maxEnhance: 0 } },
                  { itemId: 705047, category: 'Armor', sourceData: { maxEnhance: 20 } },
                  { itemId: 705048, category: 'Armor', sourceData: { maxEnhance: 0 } },
                  { itemId: 705049, category: 'Etc', sourceData: { maxEnhance: 5 } },
                ]
              : metadata;
        const query = {
          from: () => query,
          innerJoin: () => query,
          leftJoin: () => query,
          where: () => query,
          orderBy: () => query,
          limit: () => Promise.resolve(rows),
          then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
        };
        return query;
      },
      insert: () => ({
        values: (values: unknown[]) => {
          inserted.push(...values);
          return { onConflictDoNothing: () => Promise.resolve(undefined) };
        },
      }),
    },
  } as unknown as DatabaseService;
  const catalog = {
    getActiveDataset: () => Promise.resolve({ id: 'dataset', locale: 'pt' }),
    listCategories: () =>
      Promise.resolve({
        categories: [{ id: 'accessories', parentId: null, sortOrder: 3, name: 'Acessórios' }],
      }),
    listItems: (query: Record<string, unknown>) => {
      const ids = typeof query['ids'] === 'string' ? query['ids'].split(',').map(Number) : null;
      const terms = (typeof query['q'] === 'string' ? query['q'] : '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const matches = hot.filter(
        (item) =>
          (!ids || ids.includes(item.id)) &&
          terms.every((term) => item.name.toLowerCase().includes(term)) &&
          (!query['categoryId'] || metadata[item.id - 1].id === query['categoryId']),
      );
      const size = Number(query['pageSize'] ?? 20);
      const page = Number(query['page'] ?? 1);
      return Promise.resolve({
        total: matches.length,
        items: matches.slice((page - 1) * size, page * size).map(
          (item) =>
            ({
              id: item.id,
              name: item.name,
              iconUrl: `/icons/${item.id}.png`,
              categories: [
                {
                  id: metadata[item.id - 1].id,
                  parentId: null,
                  name: metadata[item.id - 1].categoryName,
                  sortOrder: 1,
                },
              ],
            }) as unknown as CatalogItem,
        ),
      });
    },
  } as unknown as CatalogService;
  const history = new MarketHistoryService(database);
  return {
    service: new MarketBoardService(
      new ConfigService({ MARKET_PROVIDER_ENABLED: enabled }),
      catalog,
      database,
      history,
    ),
    inserted,
  };
}

describe('market board', () => {
  it('excludes equipment, enhanceable items and unknown catalogue IDs before requesting production prices', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 5301, name: 'Reagente', basePrice: '1234', currentStock: 50, totalTrades: '100' },
          {
            id: 705047,
            name: 'Enhanced armour',
            basePrice: '99999',
            currentStock: 1,
            totalTrades: '100',
          },
          {
            id: 705048,
            name: 'Armour without enhance',
            basePrice: '99999',
            currentStock: 1,
            totalTrades: '100',
          },
          {
            id: 705049,
            name: 'Enhanceable material',
            basePrice: '99999',
            currentStock: 1,
            totalTrades: '100',
          },
          { id: 9999, name: 'Unknown', basePrice: '99999', currentStock: 1, totalTrades: '100' },
        ]),
      ),
    );
    const { service } = fixture();
    const result = await service.productionQuotes({ ids: '5301,705047,705048,705049,9999' });
    expect(result.items.map((item) => item.itemId)).toEqual([5301]);
    expect(JSON.parse(upstream.mock.calls[0][1]!.body as string)).toEqual([5301]);
    const unsupported = await service.productionQuotes({ ids: '705047,9999' });
    expect(unsupported.items).toEqual([]);
    expect(upstream).toHaveBeenCalledOnce();
  });

  it('retains all fifteen production batches when a market board is visited between refreshes', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(hot))));
    const { service } = fixture();
    const batches = Array.from({ length: 15 }, (_, batch) =>
      Array.from({ length: 100 }, (_, index) => batch * 100 + index + 1).join(','),
    );
    for (const ids of batches) await service.productionQuotes({ ids });
    await service.board({});
    for (const ids of batches)
      expect((await service.productionQuotes({ ids })).cacheStatus).toBe('cached');
    expect(upstream).toHaveBeenCalledTimes(16);
  });

  it('batches production quotes, preserves missing prices and caches the same IDs', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 5301, name: 'Reagente', basePrice: '1234', currentStock: 50, totalTrades: '100' },
          { id: 1407, name: 'Edania', basePrice: '0', currentStock: 0, totalTrades: '0' },
          { id: 999, name: 'Outro', basePrice: '9999', currentStock: 1, totalTrades: '1' },
        ]),
      ),
    );
    const { service } = fixture();
    const first = await service.productionQuotes({ ids: '5301,1407', region: 'sa', locale: 'pt' });
    expect(first.items.map((row) => row.itemId)).toEqual([5301]);
    expect(first.items[0].price).toBe('1234');
    await service.productionQuotes({ ids: '1407,5301', region: 'sa', locale: 'pt' });
    expect(upstream).toHaveBeenCalledTimes(1);
    await expect(
      service.productionQuotes({ ids: Array.from({ length: 101 }, (_, i) => i + 1).join(',') }),
    ).rejects.toThrow();
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('fetches one hot list for concurrent pages and enriches original icons', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(hot))));
    const { service, inserted } = fixture();
    const [first, third] = await Promise.all([service.board({}), service.board({ page: '3' })]);
    expect(first.items.map((item) => item.itemId)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(third.items[0]).toMatchObject({
      itemId: 41,
      iconUrl: '/icons/41.png',
      meanPrice: null,
      volume24h: null,
    });
    expect(first.total).toBe(55);
    expect(first.categories).toContainEqual({
      id: 'accessories',
      parentId: null,
      sortOrder: 3,
      name: 'Acessórios',
    });
    expect(inserted).toHaveLength(55);
    expect(inserted[0]).toMatchObject({ payload: { quoteScope: 'hot' } });
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][0]).toBe('https://api.arsha.io/v2/sa/hot?lang=pt');
    expect((await service.board({ pageSize: '50' })).cacheStatus).toBe('cached');
  });
  it('filters names and real catalog categories before slicing and sorts prices precisely', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => {
      const ids = options?.body ? (JSON.parse(options.body as string) as number[]) : null;
      return Promise.resolve(
        new Response(JSON.stringify(hot.filter((item) => !ids || ids.includes(item.id)))),
      );
    });
    const { service } = fixture();
    expect((await service.board({ q: 'pedra armadura' })).items.map((item) => item.itemId)).toEqual(
      [54],
    );
    const armor = await service.board({ categoryId: 'armor' });
    expect(armor.total).toBe(1);
    expect(armor.items[0].categories[0].name).toBe('Armaduras');
    expect((await service.board({ sort: 'price' })).items[0].itemId).toBe(2);
  });
  it('keeps the previous observation timestamp during provider failure and backs off', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(hot)))
      .mockRejectedValue(new Error('offline'));
    const { service } = fixture();
    const original = await service.board({});
    vi.setSystemTime(new Date('2026-10-09T12:31:00Z'));
    expect(await service.board({})).toMatchObject({
      cacheStatus: 'stale',
      fetchedAt: original.fetchedAt,
    });
    await service.board({});
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it('sorts lowest prices first with exact large integers, deterministic ties and unknown prices last', async () => {
    const payload = [
      { ...hot[0], id: 2, basePrice: '9007199254740994', currentStock: 2 },
      { ...hot[0], id: 3, basePrice: 0, currentStock: 2 },
      { ...hot[0], id: 5, basePrice: 100, currentStock: 2 },
      { ...hot[0], id: 4, basePrice: 100, currentStock: 2 },
      { ...hot[0], id: 1, basePrice: '9007199254740993', currentStock: 2 },
    ];
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(payload))),
    );
    expect(
      (await fixture().service.board({ sort: 'price' })).items.map((item) => item.itemId),
    ).toEqual([4, 5, 1, 2, 3]);
  });
  it('sorts by current price with stock and maximum price when sold out', async () => {
    const payload = [
      { ...hot[0], id: 1, basePrice: 300, currentStock: 5, priceMax: 900 },
      { ...hot[0], id: 2, basePrice: 1000, currentStock: 0, priceMax: 200 },
      { ...hot[0], id: 3, basePrice: 10000, currentStock: 0, priceMax: 0 },
      { ...hot[0], id: 4, basePrice: 400, currentStock: 2, priceMax: 800 },
      { ...hot[0], id: 5, basePrice: 0, currentStock: 0, priceMax: 100 },
    ];
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(payload))),
    );
    const { service } = fixture();
    const ids = async (direction: 'asc' | 'desc') =>
      (await service.board({ sort: 'price', direction })).items.map((item) => item.itemId);

    expect(await ids('asc')).toEqual([5, 2, 1, 4, 3]);
    expect(await ids('desc')).toEqual([4, 1, 2, 5, 3]);
  });
  it('preserves provider maximum prices in catalog summaries', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => {
      const ids = options?.body ? (JSON.parse(options.body as string) as number[]) : null;
      return Promise.resolve(
        new Response(JSON.stringify(hot.filter((item) => !ids || ids.includes(item.id)))),
      );
    });
    const result = await fixture().service.board({ q: 'Item 1' });

    expect(result.items[0]).toMatchObject({ itemId: 1, maxPrice: '500', stock: 0 });
  });
  it('applies direction and stock filter to the whole hot set before paginating', async () => {
    const payload = [
      { ...hot[0], id: 1, basePrice: 300, currentStock: 5 },
      { ...hot[0], id: 2, basePrice: 100, currentStock: 0, priceMax: 100 },
      { ...hot[0], id: 3, basePrice: 200, currentStock: 9 },
      { ...hot[0], id: 4, basePrice: 0, currentStock: 2 },
    ];
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(payload))),
    );
    const { service } = fixture();
    const ids = async (query: Record<string, unknown>) =>
      (await service.board({ pageSize: '20', ...query })).items.map((item) => item.itemId);
    expect(await ids({ sort: 'price', direction: 'desc' })).toEqual([1, 3, 2, 4]);
    expect(await ids({ sort: 'stock', direction: 'asc' })).toEqual([2, 4, 1, 3]);
    expect(await ids({ sort: 'stock' })).toEqual([3, 1, 4, 2]);
    const inStock = await service.board({ stock: 'in_stock', sort: 'price' });
    expect(inStock.items.map((item) => item.itemId)).toEqual([3, 1, 4]);
    expect(inStock.total).toBe(3);
    expect((await service.board({ stock: 'out_of_stock' })).items.map((i) => i.itemId)).toEqual([
      2,
    ]);
  });
  it('shares collector refreshes with the page cache without fetching individual item quotes', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(hot))));
    const { service } = fixture();
    await service.refresh();
    expect((await service.board({})).cacheStatus).toBe('cached');
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('observes the hot board again after eight minutes while retaining the upstream cache disclosure', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(hot))));
    const { service } = fixture();
    const original = await service.board({});
    vi.setSystemTime(new Date('2026-10-09T12:07:59Z'));
    expect((await service.board({})).fetchedAt).toBe(original.fetchedAt);
    vi.setSystemTime(new Date('2026-10-09T12:08:00Z'));
    expect(await service.board({})).toMatchObject({
      cacheStatus: 'fetched',
      refreshMinutes: 8,
      upstreamCacheMinutes: 30,
      fetchedAt: '2026-10-09T12:08:00.000Z',
    });
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it.each([
    { pageSize: 21 },
    { pageSize: 0 },
    { page: -1 },
    { region: '../sa' },
    { locale: 'xx' },
    { sort: 'volume' },
    { q: 'x'.repeat(81) },
  ])('rejects invalid queries before network access: %j', async (query) => {
    const upstream = vi.spyOn(globalThis, 'fetch');
    await expect(fixture().service.board(query)).rejects.toThrow();
    expect(upstream).not.toHaveBeenCalled();
  });
  it('honors provider disablement and rejects malformed or oversized payloads', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify([{ ...hot[0], totalTrades: -1 }]))),
      );
    await expect(fixture(false).service.board({})).rejects.toThrow();
    expect(upstream).not.toHaveBeenCalled();
    await expect(fixture().service.board({})).rejects.toThrow();
    upstream.mockImplementation(() => Promise.resolve(new Response(' '.repeat(2_000_001))));
    await expect(fixture().service.board({})).rejects.toThrow();
  });
});
