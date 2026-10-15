import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MarketBoardResponse, MarketLookupResponse } from '@bdo/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMemoryStorage } from '../testing/test-setup';
import {
  DEFAULT_MARKET_CACHE_TTL_MS,
  MARKET_STORAGE_KEY_PREFIX,
  MarketCacheService,
} from './market-cache.service';
import { RegionPreferences } from './region-preferences';

describe('MarketCacheService', () => {
  useMemoryStorage();

  let service: MarketCacheService;
  let httpTesting: HttpTestingController;

  const mockLookupResponse: MarketLookupResponse = {
    source: 'arsha',
    region: 'sa',
    locale: 'pt',
    fetchedAt: '2026-10-10T12:00:00Z',
    cacheStatus: 'cached',
    upstreamCacheMinutes: 30,
    items: [
      {
        itemId: 1408,
        subId: 0,
        name: '[Grupo] Imortalidade: Fármaco da Harmonia - Edania',
        price: '276000000',
        stock: 0,
        totalTrades: '3448',
        minPrice: '200000000',
        maxPrice: '350000000',
        lastSoldPrice: '276000000',
        lastSoldAt: '2026-10-10T11:00:00Z',
      },
    ],
  };

  const mockBoardResponse: MarketBoardResponse = {
    source: 'arsha',
    region: 'sa',
    locale: 'pt',
    fetchedAt: '2026-10-10T12:00:00Z',
    cacheStatus: 'cached',
    upstreamCacheMinutes: 30,
    total: 1,
    page: 1,
    pageSize: 20,
    categories: [],
    items: [
      {
        itemId: 676,
        subId: 0,
        name: 'Cerveja',
        price: '1200',
        minPrice: '800',
        maxPrice: '1500',
        stock: 120,
        totalTrades: '850000',
        lastSoldPrice: '1200',
        lastSoldAt: null,
        iconUrl: null,
        categories: [],
        meanPrice: '1150',
        volume24h: '50000',
        volume15d: '600000',
        volume30d: '1200000',
        observationCount: 30,
        observedFrom: null,
        observedTo: null,
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MarketCacheService,
        RegionPreferences,
      ],
    });
    service = TestBed.inject(MarketCacheService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('starts with empty or hydrated cache and caches fetched quote', () => {
    let resolvedQuote: unknown = null;
    service.resolveQuote(1408, 'sa').subscribe((q) => {
      resolvedQuote = q;
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/market/items/1408'));
    expect(req.request.method).toBe('GET');
    req.flush(mockLookupResponse);

    expect(resolvedQuote).toEqual(mockLookupResponse.items[0]);
    expect(service.getCachedQuote(1408, 'sa')).toEqual(mockLookupResponse.items[0]);
    expect(service.cachedQuotesCount()).toBe(1);
    expect(service.lastSyncAt()).not.toBeNull();
  });

  it('preserves the upstream observation time while starting a fresh local cache TTL', () => {
    const observedAt = Date.now() - 60 * 60 * 1000;
    service.cacheLookupResponse(
      {
        ...mockLookupResponse,
        fetchedAt: new Date(observedAt).toISOString(),
        cacheStatus: 'stale',
      },
      'sa',
    );

    const entry = service.getCachedQuoteEntry(1408, 'sa');
    expect(entry?.fetchedAt).toBe(observedAt);
    expect(entry?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('serves quote from memory cache without making an HTTP request when fresh', () => {
    service.cacheLookupResponse(mockLookupResponse, 'sa');
    expect(service.cachedQuotesCount()).toBe(1);

    let resolvedQuote: unknown = null;
    service.resolveQuote(1408, 'sa').subscribe((q) => {
      resolvedQuote = q;
    });

    httpTesting.expectNone((r) => r.url.includes('/market/items/1408'));
    expect(resolvedQuote).toEqual(mockLookupResponse.items[0]);
  });

  it('resolves batch quotes reusing cached items and requesting only missing ones', () => {
    // Prime 1408 in cache
    service.cacheLookupResponse(mockLookupResponse, 'sa');

    let resultMap = new Map();
    service.resolveQuotesBatch([1408, 9999], 'sa').subscribe((res) => {
      resultMap = res;
    });

    // Only 9999 should be requested via HTTP
    httpTesting.expectNone((r) => r.url.includes('/market/items/1408'));
    const req = httpTesting.expectOne((r) => r.url.includes('/market/items/9999'));
    req.flush({
      ...mockLookupResponse,
      items: [
        {
          itemId: 9999,
          subId: 0,
          name: 'Item Novo',
          price: '5000',
          stock: 10,
          totalTrades: '200',
          minPrice: '4000',
          maxPrice: '6000',
          lastSoldPrice: '5000',
          lastSoldAt: null,
        },
      ],
    });

    expect(resultMap.has(1408)).toBe(true);
    expect(resultMap.has(9999)).toBe(true);
    expect(resultMap.get(9999).price).toBe('5000');
  });

  it('emits stale quote immediately and refreshed quote after revalidation', () => {
    service.cacheLookupResponse(mockLookupResponse, 'sa');
    const key = service.quoteKey(1408, 'sa');
    service.quotesMap.update((entries) => {
      const updated = new Map(entries);
      const entry = updated.get(key)!;
      updated.set(key, { ...entry, expiresAt: Date.now() - 1 });
      return updated;
    });

    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service.resolveQuotesBatch([1408], 'sa').subscribe((result) => emissions.push(result));

    expect(emissions).toHaveLength(1);
    expect(emissions[0].get(1408)?.price).toBe('276000000');

    const req = httpTesting.expectOne((r) => r.url.includes('/market/items/1408'));
    req.flush({
      ...mockLookupResponse,
      items: [{ ...mockLookupResponse.items[0], price: '280000000' }],
    });

    expect(emissions).toHaveLength(2);
    expect(emissions[1].get(1408)?.price).toBe('280000000');
  });

  it('falls back to stale quotes when refresh fails', () => {
    service.cacheLookupResponse(mockLookupResponse, 'sa');
    const key = service.quoteKey(1408, 'sa');
    service.quotesMap.update((entries) => {
      const updated = new Map(entries);
      const entry = updated.get(key)!;
      updated.set(key, { ...entry, expiresAt: Date.now() - 1 });
      return updated;
    });

    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service.resolveQuotesBatch([1408], 'sa').subscribe((result) => emissions.push(result));
    expect(emissions).toHaveLength(1);
    expect(emissions[0].get(1408)?.price).toBe('276000000');

    httpTesting
      .expectOne((r) => r.url.includes('/market/items/1408'))
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });

    expect(emissions.at(-1)?.get(1408)?.price).toBe('276000000');
  });

  it('does not request fresh cached quotes', () => {
    service.cacheLookupResponse(mockLookupResponse, 'sa');
    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];

    service.resolveQuotesBatch([1408], 'sa').subscribe((result) => emissions.push(result));

    httpTesting.expectNone((r) => r.url.includes('/market/items/1408'));
    expect(emissions).toHaveLength(1);
    expect(emissions[0].get(1408)?.price).toBe('276000000');
  });

  it('limits batch requests to six in flight', () => {
    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service
      .resolveQuotesBatch([1, 2, 3, 4, 5, 6, 7], 'sa')
      .subscribe((result) => emissions.push(result));

    const firstWave = httpTesting.match((r) => r.url.includes('/market/items/'));
    expect(firstWave).toHaveLength(6);
    for (const request of firstWave) request.flush(mockLookupResponse);

    const secondWave = httpTesting.match((r) => r.url.includes('/market/items/'));
    expect(secondWave).toHaveLength(1);
    secondWave[0].flush(mockLookupResponse);
    expect(emissions).toHaveLength(1);
    expect(emissions[0].size).toBe(7);
  });

  it('splits long production quote requests at the API limit and combines all results', () => {
    const itemIds = Array.from({ length: 117 }, (_, index) => index + 1);
    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service.resolveProductionQuotes(itemIds, 'sa').subscribe((result) => emissions.push(result));

    const requests = httpTesting.match((request) => request.url.includes('/production-quotes'));
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      const ids = request.request.params.get('ids')!.split(',').map(Number);
      expect(ids.length).toBeLessThanOrEqual(100);
      request.flush({
        ...mockLookupResponse,
        items: ids.map((id) => ({ ...mockLookupResponse.items[0], itemId: id })),
      });
    }

    expect(emissions).toHaveLength(1);
    expect(emissions[0].size).toBe(117);
    expect(service.cachedQuotesCount()).toBe(117);
  });

  it('fetches the detailed quote when a zero-stock bulk quote omits maxPrice', () => {
    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service.resolveProductionQuotes([1408], 'sa').subscribe((result) => emissions.push(result));

    httpTesting
      .expectOne((request) => request.url.includes('/production-quotes'))
      .flush({
        ...mockLookupResponse,
        items: [
          {
            ...mockLookupResponse.items[0]!,
            price: '51',
            stock: 0,
            maxPrice: null,
          },
        ],
      });

    httpTesting
      .expectOne((request) => request.url.includes('/market/items/1408'))
      .flush({
        ...mockLookupResponse,
        items: [
          {
            ...mockLookupResponse.items[0]!,
            price: '51',
            stock: 0,
            maxPrice: '90',
          },
        ],
      });

    expect(emissions.at(-1)?.get(1408)?.maxPrice).toBe('90');
    expect(service.getCachedQuote(1408, 'sa')?.maxPrice).toBe('90');
    expect(service.isSyncing()).toBe(false);
  });

  it('enriches a fresh cached zero-stock quote that has no maximum price', () => {
    service.cacheLookupResponse(
      {
        ...mockLookupResponse,
        items: [
          {
            ...mockLookupResponse.items[0]!,
            price: '51',
            stock: 0,
            maxPrice: null,
          },
        ],
      },
      'sa',
    );
    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service.resolveProductionQuotes([1408], 'sa').subscribe((result) => emissions.push(result));

    httpTesting
      .expectOne((request) => request.url.includes('/market/items/1408'))
      .flush({
        ...mockLookupResponse,
        items: [
          {
            ...mockLookupResponse.items[0]!,
            price: '51',
            stock: 0,
            maxPrice: '90',
          },
        ],
      });

    httpTesting.expectNone((request) => request.url.includes('/production-quotes'));
    expect(emissions.at(-1)?.get(1408)?.maxPrice).toBe('90');
    expect(service.getCachedQuote(1408, 'sa')?.maxPrice).toBe('90');
  });

  it('falls back to individual market quotes when the bulk provider is unavailable', () => {
    service.cacheLookupResponse(mockLookupResponse, 'sa');
    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service
      .resolveProductionQuotes([1408, 9001], 'sa')
      .subscribe((result) => emissions.push(result));

    httpTesting
      .expectOne((request) => request.url.includes('/production-quotes'))
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });

    const fallback = httpTesting.expectOne((request) => request.url.includes('/market/items/9001'));
    fallback.flush({
      ...mockLookupResponse,
      items: [{ ...mockLookupResponse.items[0]!, itemId: 9001, name: 'Ingrediente' }],
    });
    expect(emissions.at(-1)?.get(1408)).toEqual(mockLookupResponse.items[0]);
    expect(emissions.at(-1)?.get(9001)?.price).toBe(mockLookupResponse.items[0]?.price);
    expect(service.isSyncing()).toBe(false);
  });

  it('falls back for every item in a later unavailable bulk batch', () => {
    const itemIds = Array.from({ length: 117 }, (_, index) => index + 1);
    const emissions: Map<number, (typeof mockLookupResponse.items)[number]>[] = [];
    service.resolveProductionQuotes(itemIds, 'sa').subscribe((result) => emissions.push(result));

    const requests = httpTesting.match((request) => request.url.includes('/production-quotes'));
    const first = requests.find(
      (request) => request.request.params.get('ids')!.split(',').length === 100,
    )!;
    const second = requests.find((request) => request !== first)!;
    first.flush({
      ...mockLookupResponse,
      items: itemIds.slice(0, 100).map((id) => ({ ...mockLookupResponse.items[0], itemId: id })),
    });
    second.flush('Unavailable', { status: 503, statusText: 'Unavailable' });

    let resolved = 0;
    while (resolved < 17) {
      const fallbacks = httpTesting.match((request) => request.url.includes('/market/items/'));
      expect(fallbacks.length).toBeGreaterThan(0);
      resolved += fallbacks.length;
      for (const fallback of fallbacks) {
        const itemId = Number(fallback.request.url.split('/').at(-1));
        fallback.flush({
          ...mockLookupResponse,
          items: [{ ...mockLookupResponse.items[0]!, itemId, name: `Item ${itemId}` }],
        });
      }
    }

    expect(emissions.at(-1)?.size).toBe(117);
    expect(emissions.at(-1)?.has(117)).toBe(true);
    expect(service.isSyncing()).toBe(false);
  });

  it('preloads hot items and registers individual quotes into the cache', () => {
    service.preloadHotItems('sa').subscribe();

    const req = httpTesting.expectOne((r) => r.url.includes('/market/board'));
    expect(req.request.params.get('sort')).toBe('hot');
    req.flush(mockBoardResponse);

    expect(service.getCachedQuote(676, 'sa')).not.toBeNull();
    expect(service.getCachedQuote(676, 'sa')?.price).toBe('1200');
    expect(service.getCachedQuote(676, 'sa')?.stock).toBe(120);
  });

  it('reads fresh and stale board responses by exact key and region', () => {
    service.cacheBoardResponse('board:sa:beer', mockBoardResponse, 'sa');

    const entry = service.getCachedBoardResponse('board:sa:beer', 'sa');
    expect(entry?.response).toEqual(mockBoardResponse);
    expect(entry?.expiresAt).toBeGreaterThan(Date.now());
    expect(service.getCachedBoardResponse('board:eu:beer', 'eu')).toBeNull();

    service.boardMap.update((boards) => {
      const updated = new Map(boards);
      const cached = updated.get('board:sa:beer')!;
      updated.set('board:sa:beer', { ...cached, expiresAt: Date.now() - 1 });
      return updated;
    });

    const stale = service.getCachedBoardResponse('board:sa:beer', 'sa');
    expect(stale?.response).toEqual(mockBoardResponse);
    expect(stale!.expiresAt).toBeLessThan(Date.now());
  });

  it('keys board cache entries by every effective query field', () => {
    const query = {
      region: 'sa' as const,
      search: 'beer',
      categoryId: 'materials',
      sort: 'name' as const,
      direction: 'asc' as const,
      stock: 'in_stock' as const,
      page: 2,
      pageSize: 50 as const,
    };
    const boardKey = (service as unknown as { boardKey?: (value: unknown) => string }).boardKey;
    expect(boardKey).toBeTypeOf('function');
    if (!boardKey) return;

    const key = boardKey.call(service, query);
    const variants = [
      { ...query, region: 'eu' as const },
      { ...query, search: 'wine' },
      { ...query, categoryId: 'alchemy' },
      { ...query, sort: 'price' as const },
      { ...query, direction: 'desc' as const },
      { ...query, stock: 'out_of_stock' as const },
      { ...query, page: 3 },
      { ...query, pageSize: 100 as const },
    ];
    for (const variant of variants) expect(boardKey.call(service, variant)).not.toBe(key);
  });

  it('shares one in-flight board request for identical query keys', () => {
    const query = {
      region: 'sa' as const,
      search: '',
      categoryId: '',
      sort: 'hot' as const,
      direction: 'desc' as const,
      stock: 'all' as const,
      page: 1,
      pageSize: 20 as const,
    };
    const resolver = (
      service as unknown as {
        resolveBoard?: (
          value: typeof query,
          forceRefresh?: boolean,
        ) => import('rxjs').Observable<unknown>;
      }
    ).resolveBoard;
    expect(resolver).toBeTypeOf('function');
    if (!resolver) return;

    let first: unknown;
    let second: unknown;
    resolver.call(service, query).subscribe((value) => (first = value));
    resolver.call(service, query).subscribe((value) => (second = value));
    const requests = httpTesting.match((request) => request.url.endsWith('/market/board'));
    expect(requests).toHaveLength(1);
    requests[0]?.flush(mockBoardResponse);
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    httpTesting.verify();
  });

  it('emits an exact stale board before refresh and preserves it after refresh failure', () => {
    const query = {
      region: 'sa' as const,
      search: '',
      categoryId: '',
      sort: 'hot' as const,
      direction: 'desc' as const,
      stock: 'all' as const,
      page: 1,
      pageSize: 20 as const,
    };
    const boardKey = (service as unknown as { boardKey?: (value: unknown) => string }).boardKey;
    const resolver = (
      service as unknown as {
        resolveBoard?: (
          value: typeof query,
          forceRefresh?: boolean,
        ) => import('rxjs').Observable<unknown>;
      }
    ).resolveBoard;
    expect(boardKey).toBeTypeOf('function');
    expect(resolver).toBeTypeOf('function');
    if (!boardKey || !resolver) return;

    const key = boardKey.call(service, query);
    service.cacheBoardResponse(key, mockBoardResponse, 'sa');
    const original = service.getCachedBoardResponse(key, 'sa')!;
    service.boardMap.update((entries) => {
      const updated = new Map(entries);
      updated.set(key, { ...original, expiresAt: Date.now() - 1 });
      return updated;
    });

    const emissions: unknown[] = [];
    let failed = false;
    resolver.call(service, query).subscribe({
      next: (value) => emissions.push(value),
      error: () => (failed = true),
    });
    expect(emissions[0]).toEqual(expect.objectContaining({ response: mockBoardResponse }));
    const request = httpTesting.expectOne((request) => request.url.endsWith('/market/board'));
    request.flush('Unavailable', { status: 503, statusText: 'Unavailable' });

    expect(failed).toBe(true);
    expect(service.getCachedBoardResponse(key, 'sa')?.response).toEqual(mockBoardResponse);
  });

  it('aliases locally sorted board views without renewing their freshness', () => {
    service.cacheBoardResponse('board:sa:default', mockBoardResponse, 'sa');
    const source = service.getCachedBoardResponse('board:sa:default', 'sa')!;

    service.cacheBoardAlias('board:sa:sorted', source);

    const alias = service.getCachedBoardResponse('board:sa:sorted', 'sa')!;
    expect(alias.response).toEqual(source.response);
    expect(alias.fetchedAt).toBe(source.fetchedAt);
    expect(alias.expiresAt).toBe(source.expiresAt);
    expect(alias.key).toBe('board:sa:sorted');
  });

  it('hydrates quotes from localStorage on construction', () => {
    const stored = [
      {
        quote: mockLookupResponse.items[0],
        region: 'sa' as const,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + DEFAULT_MARKET_CACHE_TTL_MS,
      },
    ];
    localStorage.setItem(`${MARKET_STORAGE_KEY_PREFIX}sa`, JSON.stringify(stored));

    service.hydrateFromStorage('sa');
    expect(service.getCachedQuote(1408, 'sa')?.name).toBe(
      '[Grupo] Imortalidade: Fármaco da Harmonia - Edania',
    );
  });
});
