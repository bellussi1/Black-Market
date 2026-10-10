import type { CatalogItem } from '@bdo/shared';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogService } from '../catalog/catalog.service';
import type { DatabaseService } from '../database/database.service';
import { MarketBoardService } from './market-board.service';
import { MarketHistoryService } from './market-history.service';

const category = { id: 'crystals', parentId: 'materials', name: 'Cristais', sortOrder: 1 };
const catalogItems = Array.from({ length: 130 }, (_, index) => ({
  id: 500000 + index,
  name: `Cristal ${String(index + 1).padStart(3, '0')}`,
  iconUrl: `/icons/${500000 + index}.png`,
  categories: [category],
})) as unknown as CatalogItem[];

function fixture(candidates: CatalogItem[] = catalogItems) {
  const saved: unknown[] = [];
  const database = {
    db: {
      insert: () => ({
        values: (rows: unknown[]) => {
          saved.push(...rows);
          return { onConflictDoNothing: () => Promise.resolve() };
        },
      }),
    },
  } as unknown as DatabaseService;
  const catalog = {
    listCategories: () => Promise.resolve({ categories: [category] }),
    listItems: (query: Record<string, unknown>) => {
      const q = typeof query['q'] === 'string' ? query['q'].toLowerCase() : '';
      const ids = typeof query['ids'] === 'string' ? query['ids'].split(',').map(Number) : null;
      const matches = candidates.filter(
        (item) =>
          (!ids || ids.includes(item.id)) &&
          (!q || item.name.toLowerCase().includes(q) || String(item.id) === q) &&
          (!query['categoryId'] || query['categoryId'] === category.id),
      );
      const size = Number(query['pageSize'] ?? 20);
      const page = Number(query['page'] ?? 1);
      return Promise.resolve({
        items: matches.slice((page - 1) * size, page * size),
        total: matches.length,
      });
    },
  } as unknown as CatalogService;
  return {
    service: new MarketBoardService(
      new ConfigService(),
      catalog,
      database,
      new MarketHistoryService(database),
    ),
    saved,
  };
}

function quotes(ids: number[]) {
  return ids.map((id) => ({
    id,
    name: `Provider ${id}`,
    currentStock: 2,
    basePrice: '9007199254740993',
    totalTrades: '9007199254740994',
  }));
}

describe('full catalog market search', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('finds non-hot Portuguese items, paginates the catalog first and retains uncotado items', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => {
      const ids = JSON.parse(options?.body as string) as number[];
      if (!Array.isArray(ids))
        return Promise.resolve(new Response('Invalid request body', { status: 400 }));
      return Promise.resolve(new Response(JSON.stringify(quotes(ids.slice(0, -1)))));
    });
    const { service, saved } = fixture();
    const result = await service.board({ q: 'cristal', page: 2, pageSize: 100, sort: 'price' });
    expect(result.total).toBe(130);
    expect(result.items).toHaveLength(30);
    expect(result.items[0]).toMatchObject({
      itemId: 500100,
      name: 'Cristal 101',
      price: '9007199254740993',
      stock: 2,
      quoteScope: 'summary',
      meanPrice: null,
    });
    expect(result.items[29]).toMatchObject({
      itemId: 500129,
      price: null,
      stock: null,
      totalTrades: null,
      marketAvailable: false,
    });
    expect(result).toMatchObject({
      scope: 'search',
      sort: 'name',
      refreshMinutes: 8,
      upstreamCacheMinutes: 30,
      categories: [category],
    });
    expect(upstream.mock.calls[0][0]).toBe('https://api.arsha.io/v2/sa/search?lang=pt');
    expect(JSON.parse(upstream.mock.calls[0][1]?.body as string)).toHaveLength(30);
    expect(saved).toEqual([]);
  });

  it('queries an exact provider ID absent from the local catalog without loading the hot board', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(quotes([16001])[0])));
    const result = await fixture().service.board({ q: '16001' });
    expect(result.items[0]).toMatchObject({ itemId: 16001, stock: 2, quoteScope: 'summary' });
    expect(result.total).toBe(1);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('queries all category candidates beyond hot and does not fetch empty pages', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_url, options) =>
        Promise.resolve(
          new Response(JSON.stringify(quotes(JSON.parse(options?.body as string) as number[]))),
        ),
      );
    const service = fixture().service;
    const first = await service.board({ categoryId: 'crystals' });
    expect(first).toMatchObject({ scope: 'category', total: 130 });
    expect(first.items).toHaveLength(20);
    expect((await service.board({ categoryId: 'crystals', page: 8 })).items).toEqual([]);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('deduplicates matching pages, refreshes after 8 minutes and preserves stale summary timestamps', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_url, options) =>
        Promise.resolve(
          new Response(JSON.stringify(quotes(JSON.parse(options?.body as string) as number[]))),
        ),
      );
    const service = fixture().service;
    const [original] = await Promise.all([
      service.board({ q: 'cristal' }),
      service.board({ q: 'cristal' }),
    ]);
    expect(upstream).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-10-09T12:08:00Z'));
    const refreshed = await service.board({ q: 'cristal' });
    expect(refreshed.fetchedAt).not.toBe(original.fetchedAt);
    expect(upstream).toHaveBeenCalledTimes(2);
    upstream.mockRejectedValue(new Error('offline'));
    vi.setSystemTime(new Date('2026-10-09T12:16:00Z'));
    expect(await service.board({ q: 'cristal' })).toMatchObject({
      cacheStatus: 'stale',
      fetchedAt: refreshed.fetchedAt,
    });
    await service.board({ q: 'cristal' });
    expect(upstream).toHaveBeenCalledTimes(3);
  });

  it('leaves unsafe and foreign quotes unknown without associating them with catalog candidates', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ ...quotes([500000])[0], basePrice: 9007199254740992 }])),
      );
    const unsafe = await fixture().service.board({ q: 'cristal' });
    expect(unsafe).toMatchObject({ cacheStatus: 'stale', quotesUnavailable: true });
    expect(unsafe.items.every((item) => item.marketAvailable === false)).toBe(true);
    upstream.mockResolvedValueOnce(new Response(JSON.stringify(quotes([999]))));
    const foreign = await fixture().service.board({ q: 'cristal' });
    expect(foreign.items).toHaveLength(20);
    expect(foreign.items.every((item) => item.marketAvailable === false)).toBe(true);
    expect(foreign.items[0].itemId).toBe(500000);
  });
  it('keeps unknown and nonmarketable zero summaries uncotado while preserving sold-out priced items', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 500000, name: 'NONAME', basePrice: 0, currentStock: 0, totalTrades: 0 },
          { id: 500001, name: 'Moeda de Prata', basePrice: 0, currentStock: 0, totalTrades: 0 },
          { id: 500002, name: 'Cristal 003', basePrice: 100, currentStock: 0, totalTrades: 0 },
        ]),
      ),
    );
    const result = await fixture().service.board({ q: 'cristal' });
    expect(
      result.items.slice(0, 2).map((item) => ({
        price: item.price,
        stock: item.stock,
        totalTrades: item.totalTrades,
        marketAvailable: item.marketAvailable,
      })),
    ).toEqual([
      { price: null, stock: null, totalTrades: null, marketAvailable: false },
      { price: null, stock: null, totalTrades: null, marketAvailable: false },
    ]);
    expect(result.items[2]).toMatchObject({
      price: '100',
      stock: 0,
      totalTrades: '0',
      marketAvailable: true,
    });
    expect(result.total).toBe(130);
  });
  it('preserves a 100-item page when the live provider repeats the current ID for legacy ID 16', async () => {
    // Actual SA /search response for requested [16,16004], captured 2026-10-09.
    const response = [
      {
        name: 'Pedra Negra de Magia Concentrada',
        id: 16004,
        currentStock: 2167,
        basePrice: 6100000,
        totalTrades: 35987967,
      },
      {
        name: 'Pedra Negra de Magia Concentrada',
        id: 16004,
        currentStock: 0,
        basePrice: 0,
        totalTrades: 0,
      },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response)));
    const candidates = [
      { ...catalogItems[0], id: 16, name: 'Pedra Negra Pura' },
      { ...catalogItems[1], id: 16004, name: 'Pedra Negra de Magia Concentrada' },
      ...catalogItems.slice(2, 100).map((item) => ({ ...item, name: `Pedra ${item.name}` })),
    ];
    const result = await fixture(candidates).service.board({ q: 'pedra', pageSize: 100 });
    expect(result.items).toHaveLength(100);
    expect(result.total).toBe(100);
    expect(result.items[0]).toMatchObject({
      itemId: 16,
      price: null,
      stock: null,
      marketAvailable: false,
    });
    expect(result.items[1]).toMatchObject({
      itemId: 16004,
      price: '6100000',
      stock: 2167,
      totalTrades: '35987967',
      marketAvailable: true,
    });
  });
  it('leaves conflicting positive summaries unknown while preserving other quoted items', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { ...quotes([500000])[0], basePrice: 100 },
          { ...quotes([500000])[0], basePrice: 200 },
          quotes([500001])[0],
          quotes([500001])[0],
        ]),
      ),
    );
    const result = await fixture().service.board({ q: 'cristal' });
    expect(result.items[0]).toMatchObject({ marketAvailable: false, price: null, stock: null });
    expect(result.items[1]).toMatchObject({ marketAvailable: true, price: '9007199254740993' });
    expect(result.total).toBe(130);
  });
  it('keeps a cold 100-item catalog page available during a provider outage and retries after backoff', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 500,
            code: 103,
            message:
              'One or more requests returned invalid data (probably blocked by Imperva). Try again later.',
          }),
          { status: 500 },
        ),
      )
      .mockImplementation((_url, options) =>
        Promise.resolve(
          new Response(JSON.stringify(quotes(JSON.parse(options?.body as string) as number[]))),
        ),
      );
    const { service, saved } = fixture();
    const unavailable = await service.board({ q: 'cristal', pageSize: 100 });
    expect(unavailable).toMatchObject({
      total: 130,
      cacheStatus: 'stale',
      quotesUnavailable: true,
    });
    expect(unavailable.items).toHaveLength(100);
    expect(
      unavailable.items.every(
        (item) =>
          item.price === null &&
          item.stock === null &&
          item.totalTrades === null &&
          item.marketAvailable === false,
      ),
    ).toBe(true);
    await service.board({ q: 'cristal', pageSize: 100 });
    expect(upstream).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-10-09T12:01:00Z'));
    const recovered = await service.board({ q: 'cristal', pageSize: 100 });
    expect(recovered).toMatchObject({ cacheStatus: 'fetched', quotesUnavailable: false });
    expect(recovered.items[0].price).toBe('9007199254740993');
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(saved).toEqual([]);
  });
});
