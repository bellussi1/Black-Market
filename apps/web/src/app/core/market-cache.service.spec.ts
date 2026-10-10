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

  it('preloads hot items and registers individual quotes into the cache', () => {
    service.preloadHotItems('sa').subscribe();

    const req = httpTesting.expectOne((r) => r.url.includes('/market/board'));
    expect(req.request.params.get('sort')).toBe('hot');
    req.flush(mockBoardResponse);

    expect(service.getCachedQuote(676, 'sa')).not.toBeNull();
    expect(service.getCachedQuote(676, 'sa')?.price).toBe('1200');
    expect(service.getCachedQuote(676, 'sa')?.stock).toBe(120);
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
