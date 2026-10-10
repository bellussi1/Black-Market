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
        const rows = 'payload' in selection ? [] : metadata;
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
    listItems: (query: Record<string, unknown>) =>
      Promise.resolve({
        items: String(query['ids'])
          .split(',')
          .map(
            (id) =>
              ({
                id: Number(id),
                name: `Catálogo ${id}`,
                iconUrl: `/icons/${id}.png`,
                categories: [],
              }) as unknown as CatalogItem,
          ),
      }),
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
    expect(inserted).toHaveLength(55);
    expect(inserted[0]).toMatchObject({ payload: { quoteScope: 'hot' } });
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][0]).toBe('https://api.arsha.io/v2/sa/hot?lang=pt');
    expect((await service.board({ pageSize: '50' })).cacheStatus).toBe('cached');
  });
  it('filters names and real catalog categories before slicing and sorts prices precisely', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(hot))),
    );
    const { service } = fixture();
    expect((await service.board({ q: 'pedra armadura' })).items.map((item) => item.itemId)).toEqual(
      [54],
    );
    const armor = await service.board({ categoryId: 'armor' });
    expect(armor.total).toBe(1);
    expect(armor.items[0].categories[0].name).toBe('Armaduras');
    expect((await service.board({ sort: 'price' })).items[0].itemId).toBe(1);
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
      { ...hot[0], id: 2, basePrice: '9007199254740994' },
      { ...hot[0], id: 3, basePrice: 0 },
      { ...hot[0], id: 5, basePrice: 100 },
      { ...hot[0], id: 4, basePrice: 100 },
      { ...hot[0], id: 1, basePrice: '9007199254740993' },
    ];
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(payload))),
    );
    expect(
      (await fixture().service.board({ sort: 'price' })).items.map((item) => item.itemId),
    ).toEqual([4, 5, 1, 2, 3]);
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
