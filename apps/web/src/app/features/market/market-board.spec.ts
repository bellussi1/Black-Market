import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MarketBoardResponse } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { MarketCacheService } from '../../core/market-cache.service';
import { RegionPreferences } from '../../core/region-preferences';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { MarketBoard } from './market-board';

function response(page = 1, pageSize: 20 | 50 | 100 = 20): MarketBoardResponse {
  return {
    source: 'arsha',
    region: 'sa',
    locale: 'pt',
    fetchedAt: '2026-10-09T12:00:00Z',
    cacheStatus: 'cached',
    upstreamCacheMinutes: 30,
    total: 395,
    page,
    pageSize,
    categories: [],
    items: [
      {
        itemId: 676,
        subId: 0,
        name: 'Cerveja',
        price: '1200',
        minPrice: '500',
        maxPrice: '2000',
        stock: 42,
        totalTrades: '50000',
        lastSoldAt: null,
        lastSoldPrice: '1200',
        iconUrl: null,
        categories: [],
        meanPrice: null,
        volume24h: null,
        volume15d: null,
        volume30d: null,
        observationCount: 1,
        observedFrom: null,
        observedTo: null,
      },
    ],
  };
}
const takeRequest = () =>
  TestBed.inject(HttpTestingController).expectOne((request) =>
    request.url.endsWith('/market/board'),
  );

describe('MarketBoard', () => {
  useMemoryStorage();
  it('shows only the observed mean price and opens details with the row button', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    data.items[0].meanPrice = '1100';
    takeRequest().flush(data);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.col-price')?.textContent).toContain('1.100');
    expect(element.querySelector('.price-limits')).toBeNull();
    expect(element.querySelector('thead')?.textContent).not.toContain('Bottom');
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);
    element.querySelector<HTMLButtonElement>('.board-item')!.click();
    expect(selected).toHaveBeenCalledWith(data.items[0]);
    fixture.componentInstance.toggleColumnSort('meanPrice');
    expect(fixture.componentInstance.pageOnlyOrdering()).toBe(true);
    TestBed.inject(HttpTestingController).verify();
  });
  it('keeps catalogue results visible and explains unavailable provider quotes', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    data.scope = 'search';
    data.cacheStatus = 'stale';
    data.quotesUnavailable = true;
    data.items[0] = {
      ...data.items[0],
      quoteScope: 'summary',
      marketAvailable: false,
      price: null,
      stock: null,
      totalTrades: null,
      minPrice: null,
      maxPrice: null,
    };
    takeRequest().flush(data);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.board-item')?.textContent).toContain('Cerveja');
    expect(element.textContent).toContain('A fonte não forneceu novas cotações');
    expect(element.querySelector('.board-summary')?.textContent).toContain(
      'Cotações indisponíveis',
    );
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    TestBed.inject(HttpTestingController).verify();
  });

  it('paginates on the server and resets the page when changing page size', async () => {
    const fixture = await renderComponent(MarketBoard);
    const board = fixture.componentInstance;
    const request = takeRequest();
    expect(request.request.params.get('pageSize')).toBe('20');
    expect(request.request.params.get('sort')).toBe('hot');
    request.flush(response());
    fixture.detectChanges();
    fixture.nativeElement.querySelector('nav button:last-child').click();
    expect(takeRequest().request.params.get('page')).toBe('2');
    board.setPageSize('100');
    const larger = takeRequest();
    expect(larger.request.params.get('page')).toBe('1');
    expect(larger.request.params.get('pageSize')).toBe('100');
    larger.flush(response(1, 100));
    fixture.detectChanges();
    expect(board.pageCount()).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('1–100 de 395');
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps absent historical metrics unknown and emits the exact item variant', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    data.items[0].subId = 3;
    takeRequest().flush(data);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelector('[title="Histórico insuficiente para 24 horas"]')?.textContent?.trim(),
    ).toBe('—');
    expect(element.textContent).not.toContain('Bottom');
    const emit = vi.spyOn(fixture.componentInstance.selected, 'emit');
    element.querySelector<HTMLButtonElement>('.board-item')!.click();
    expect(emit).toHaveBeenCalledWith(data.items[0]);
    TestBed.inject(HttpTestingController).verify();
  });

  it('labels market counter differences as registered trades, not item units', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    data.items[0].volume24h = '35';
    takeRequest().flush(data);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('caption')?.textContent).toContain(
      'contagem acumulada de negociações',
    );
    expect(element.querySelector('thead')?.textContent).toContain('Registros 24h');
    expect(
      element.querySelector('[title*="contador total de negociações"]')?.textContent,
    ).toContain('35');
    expect(element.textContent).not.toContain('unidades negociadas');
    TestBed.inject(HttpTestingController).verify();
  });

  it('filters the complete list before pagination and discards a pending older query', async () => {
    const fixture = await renderComponent(MarketBoard);
    const initial = takeRequest();
    fixture.componentInstance.filterCategory('alchemy');
    expect(initial.cancelled).toBe(true);
    const filtered = takeRequest();
    expect(filtered.request.params.get('categoryId')).toBe('alchemy');
    expect(filtered.request.params.get('page')).toBe('1');
    filtered.flush(response());
    fixture.componentInstance.find('Cerveja');
    fixture.componentInstance.load();
    const search = takeRequest();
    expect(search.request.params.get('q')).toBe('Cerveja');
    search.flush(response());
    TestBed.inject(HttpTestingController).verify();
  });

  it('uses catalog search context and keeps unknown stock separate from zero', async () => {
    const fixture = await renderComponent(MarketBoard);
    takeRequest().flush(response());
    fixture.componentInstance.find('676');
    fixture.componentInstance.load();
    const request = takeRequest();
    expect(request.request.params.get('sort')).toBe('name');
    const data = response();
    data.scope = 'search';
    data.items[0] = {
      ...data.items[0],
      quoteScope: 'summary',
      marketAvailable: false,
      stock: null,
      price: null,
    };
    request.flush(data);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Catálogo do mercado');
    expect(element.textContent).toContain('Sem cotação');
    expect(element.querySelector('.col-stock')?.textContent?.trim()).toBe('—');
    expect(element.querySelector('.sort-select-wrap')).toBeNull();
    expect(element.querySelectorAll('thead .col-sort-btn')).toHaveLength(6);
    TestBed.inject(HttpTestingController).verify();
  });

  it('sorts columns interactively and calculates price trends', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    data.items = [
      {
        ...data.items[0],
        itemId: 1,
        name: 'Alpha Item',
        price: '1000',
        meanPrice: '800', // +25%
        stock: 10,
        volume24h: '500',
      },
      {
        ...data.items[0],
        itemId: 2,
        name: 'Beta Item',
        price: '5000',
        meanPrice: '6000', // -16.7%
        stock: 5,
        volume24h: '2000',
      },
    ];
    takeRequest().flush(data);
    fixture.detectChanges();

    const board = fixture.componentInstance;
    expect(board.displayItems().length).toBe(2);

    // Test trend calculation
    const trendAlpha = board.calculateTrend(data.items[0]);
    expect(trendAlpha?.direction).toBe('up');
    expect(trendAlpha?.label).toContain('+25.0%');

    const trendBeta = board.calculateTrend(data.items[1]);
    expect(trendBeta?.direction).toBe('down');

    // Price sort is delegated to the API so it applies before pagination.
    board.toggleColumnSort('price');
    expect(board.sortColumn()).toBe('price');
    expect(board.sortDirection()).toBe('desc');
    const descending = takeRequest();
    expect(descending.request.params.get('sort')).toBe('price');
    expect(descending.request.params.get('direction')).toBe('desc');
    expect(descending.request.params.get('page')).toBe('1');
    descending.flush(data);

    board.toggleColumnSort('price');
    expect(board.sortDirection()).toBe('asc');
    const ascending = takeRequest();
    expect(ascending.request.params.get('direction')).toBe('asc');
    ascending.flush(data);
    TestBed.inject(HttpTestingController).verify();
  });

  it('sends the stock filter to the API instead of filtering the visible page', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    data.items = [
      { ...data.items[0], itemId: 1, name: 'In Stock', stock: 15 },
      { ...data.items[0], itemId: 2, name: 'Out of Stock', stock: 0 },
    ];
    const initial = takeRequest();
    expect(initial.request.params.has('stock')).toBe(false);
    initial.flush(data);
    fixture.detectChanges();

    const board = fixture.componentInstance;
    expect(board.displayItems().length).toBe(2);

    board.setStockFilter('in_stock');
    const inStock = takeRequest();
    expect(inStock.request.params.get('stock')).toBe('in_stock');
    inStock.flush({ ...data, items: [data.items[0]], total: 1 });
    expect(board.displayItems().map((item) => item.itemId)).toEqual([1]);

    board.setStockFilter('all');
    TestBed.inject(HttpTestingController).expectNone((request) =>
      request.url.endsWith('/market/board'),
    );
    expect(board.displayItems().map((item) => item.itemId)).toEqual([1, 2]);
    TestBed.inject(HttpTestingController).verify();
  });

  it('uses a fresh same-query cache entry without requesting the board again', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    takeRequest().flush(data);

    const board = fixture.componentInstance;
    board.load();

    expect(board.result()).toEqual(data);
    expect(board.loading()).toBe(false);
    TestBed.inject(HttpTestingController).expectNone((request) =>
      request.url.endsWith('/market/board'),
    );
    TestBed.inject(HttpTestingController).verify();
  });

  it('forces manual refresh while keeping the current table visible', async () => {
    const fixture = await renderComponent(MarketBoard);
    const first = response();
    takeRequest().flush(first);

    fixture.componentInstance.refreshBoard();
    expect(fixture.componentInstance.result()).toEqual(first);
    expect(fixture.componentInstance.loading()).toBe(true);

    const updated = response();
    updated.items[0].price = '1350';
    takeRequest().flush(updated);
    expect(fixture.componentInstance.result()?.items[0].price).toBe('1350');
    TestBed.inject(HttpTestingController).verify();
  });

  it('returns to an earlier query from its matching cache entry', async () => {
    const fixture = await renderComponent(MarketBoard);
    const original = response();
    takeRequest().flush(original);
    const board = fixture.componentInstance;

    board.find('Edania');
    board.load();
    const otherQuery = takeRequest();
    expect(otherQuery.request.params.get('q')).toBe('Edania');
    otherQuery.flush(response());

    board.find('');
    expect(board.result()).toEqual(original);
    expect(board.loading()).toBe(false);
    board.load();
    TestBed.inject(HttpTestingController).expectNone((request) =>
      request.url.endsWith('/market/board'),
    );
    TestBed.inject(HttpTestingController).verify();
  });

  it('cancels a pending response when the selected region changes', async () => {
    const fixture = await renderComponent(MarketBoard);
    const pending = takeRequest();

    TestBed.inject(RegionPreferences).setRegion('eu');
    fixture.detectChanges();

    expect(pending.cancelled).toBe(true);
    const euRequest = takeRequest();
    expect(euRequest.request.params.get('region')).toBe('eu');
    euRequest.flush({ ...response(), region: 'eu' });
    expect(fixture.componentInstance.result()?.region).toBe('eu');
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps stale cached results visible when background refresh fails', async () => {
    const fixture = await renderComponent(MarketBoard);
    const data = response();
    takeRequest().flush(data);

    const board = fixture.componentInstance;
    const cache = TestBed.inject(MarketCacheService);
    const [key, entry] = [...cache.boardMap().entries()][0];
    cache.boardMap.update((entries) => {
      const updated = new Map(entries);
      updated.set(key, { ...entry, expiresAt: Date.now() - 1 });
      return updated;
    });

    board.load();
    expect(board.result()).toEqual(data);
    expect(board.loading()).toBe(true);
    takeRequest().flush('Unavailable', { status: 503, statusText: 'Unavailable' });

    expect(board.result()).toEqual(data);
    expect(board.loading()).toBe(false);
    expect(board.error()).toContain('Não foi possível carregar');
    TestBed.inject(HttpTestingController).verify();
  });

  it('does not display the previous search results while the next search is debounced', async () => {
    const fixture = await renderComponent(MarketBoard);
    takeRequest().flush(response());

    fixture.componentInstance.find('Edania');

    expect(fixture.componentInstance.result()).toBeNull();
    TestBed.inject(HttpTestingController).expectNone((request) =>
      request.url.endsWith('/market/board'),
    );
  });

  it('debounces search requests by 250 milliseconds', async () => {
    const fixture = await renderComponent(MarketBoard);
    takeRequest().flush(response());
    const board = fixture.componentInstance;

    vi.useFakeTimers();
    try {
      board.find('Ed');
      vi.advanceTimersByTime(249);
      TestBed.inject(HttpTestingController).expectNone((request) =>
        request.url.endsWith('/market/board'),
      );
      vi.advanceTimersByTime(1);
      expect(takeRequest().request.params.get('q')).toBe('Ed');
    } finally {
      vi.useRealTimers();
    }
  });
});
