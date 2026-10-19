import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CatalogCategory, MarketBoardResponse } from '@bdo/shared';
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

async function renderMarketBoard(categories: CatalogCategory[] = []) {
  const fixture = await renderComponent(MarketBoard);
  const requests = TestBed.inject(HttpTestingController).match((request) =>
    request.url.endsWith('/categories'),
  );
  expect(requests).toHaveLength(1);
  requests[0]?.flush({ categories, dataset: null });
  return fixture;
}

describe('MarketBoard', () => {
  useMemoryStorage();
  it('keeps market navigation and the table state inside its domain window', async () => {
    const fixture = await renderMarketBoard();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.market-window h2')).not.toBeNull();
    expect(element.querySelector('.market-window .board-search input')).not.toBeNull();
    expect(element.querySelector('.market-categories button[aria-pressed="true"]')).not.toBeNull();
    expect(element.querySelector('.board-table-scroll[role="region"]')).not.toBeNull();
  });

  it('reserves the category tree and announces taxonomy loading', async () => {
    const fixture = await renderComponent(MarketBoard);
    const http = TestBed.inject(HttpTestingController);
    const categories = http.expectOne((request) => request.url.endsWith('/categories'));
    const board = http.expectOne((request) => request.url.endsWith('/market/board'));
    const loading = fixture.nativeElement.querySelector('.market-category-skeleton');

    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.market-category-skeleton-row')).toHaveLength(6);

    categories.flush({ categories: [], dataset: null });
    board.flush(response());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.market-category-skeleton')).toBeNull();
    http.verify();
  });

  it('shows only the observed mean price and opens details with the row button', async () => {
    const fixture = await renderMarketBoard();
    const data = response();
    data.items[0].meanPrice = '1100';
    takeRequest().flush(data);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.mean-price')?.textContent).toContain('1.100');
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
  it('shows reference price and its basis separately from the 30-day mean', async () => {
    const fixture = await renderMarketBoard();
    const data = response();
    data.items = [
      {
        ...data.items[0],
        itemId: 1,
        name: 'Disponível',
        price: '1200',
        stock: 42,
        maxPrice: '2000',
        meanPrice: '1100',
      },
      {
        ...data.items[0],
        itemId: 2,
        name: 'Esgotado',
        price: '1200',
        stock: 0,
        maxPrice: '2300',
        meanPrice: '1000',
      },
      {
        ...data.items[0],
        itemId: 3,
        name: 'Sem cotação',
        price: null,
        stock: null,
        maxPrice: null,
        meanPrice: null,
      },
    ];
    takeRequest().flush(data);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const headers = [...element.querySelectorAll('thead th')].map((header) =>
      header.textContent?.trim(),
    );
    const rows = [...element.querySelectorAll('tbody tr')];
    expect(headers.some((heading) => heading?.includes('Preço de referência'))).toBe(true);
    expect(element.querySelector('.mean-price')?.textContent).toContain('Média 30d: 1.100');
    expect(rows[0].querySelector('.col-reference-price')?.textContent).toContain('1.200');
    expect(rows[0].querySelector('.reference-basis')?.textContent).toContain('Atual · com estoque');
    expect(rows[1].querySelector('.col-reference-price')?.textContent).toContain('2.300');
    expect(rows[1].querySelector('.reference-basis')?.textContent).toContain(
      'Máxima · sem estoque',
    );
    expect(rows[2].querySelector('.col-reference-price')?.textContent).toContain('—');
    expect(rows[2].querySelector('.reference-basis')?.textContent).toContain('Sem cotação');
    expect(rows[0].querySelector('.mean-price')?.textContent).toContain('Média 30d: 1.100');
    expect(element.querySelector('.filter-pills')?.getAttribute('role')).toBe('group');
    expect(element.querySelector('.pill-btn.active')?.getAttribute('aria-pressed')).toBe('true');
    TestBed.inject(HttpTestingController).verify();
  });
  it('aligns market values with table headers and confines selection to the item cell', async () => {
    const fixture = await renderMarketBoard();
    takeRequest().flush(response());
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const headers = element.querySelectorAll('thead th');
    const row = element.querySelector('tbody tr.board-row')!;
    expect(row.querySelectorAll(':scope > th, :scope > td')).toHaveLength(headers.length);
    const selectItem = row.querySelector<HTMLButtonElement>('th[scope="row"] .board-item');
    expect(selectItem).not.toBeNull();
    expect(selectItem?.tabIndex).toBe(0);
    selectItem?.focus();
    expect(document.activeElement).toBe(selectItem);
    expect(row.querySelectorAll('button')).toHaveLength(1);
    expect(row.querySelector('td[colspan]')).toBeNull();

    const filters = [...element.querySelectorAll<HTMLButtonElement>('.filter-pills button')];
    expect(element.querySelector('.filter-pills')?.getAttribute('role')).toBe('group');
    expect(filters.map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    TestBed.inject(HttpTestingController).verify();
  });
  it('shows market context and labels the visible stock filters', async () => {
    const fixture = await renderMarketBoard();
    takeRequest().flush(response());
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.titlebar-kicker')?.textContent).toContain('MERCADO CENTRAL');
    expect(element.querySelector('.titlebar-cache')?.textContent).toContain('Cotações em cache');
    expect(element.querySelector('.filter-group-label')?.textContent).toContain('Disponibilidade');
    expect(element.querySelector('.filter-actions button.btn-refresh-market')).not.toBeNull();
    TestBed.inject(HttpTestingController).verify();
  });
  it('keeps catalogue results visible and explains unavailable provider quotes', async () => {
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
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

  it('keeps pagination controls above the table and reserves their loading layout', async () => {
    const fixture = await renderMarketBoard();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const pagination = element.querySelector<HTMLElement>('.board-pagination')!;
    const table = element.querySelector<HTMLElement>('.board-table-scroll')!;
    expect(pagination.parentElement?.classList.contains('board-summary')).toBe(true);
    expect(
      pagination.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(pagination.querySelector('select[aria-label="Itens por página"]')).not.toBeNull();
    expect(pagination.querySelector('.pagination-range-skeleton')).not.toBeNull();
    expect(pagination.querySelector('.pagination-page-skeleton')).not.toBeNull();
    expect(element.querySelectorAll('.board-skeleton-row')).toHaveLength(10);

    takeRequest().flush(response());
    fixture.detectChanges();

    expect(pagination.querySelector('.pagination-range-skeleton')).toBeNull();
    expect(pagination.textContent).toContain('1 / 20');
    expect(element.querySelectorAll('.board-skeleton-row')).toHaveLength(0);
    TestBed.inject(HttpTestingController).verify();
  });

  it('groups page size and navigation into one pagination action cluster', async () => {
    const fixture = await renderMarketBoard();
    const element = fixture.nativeElement as HTMLElement;
    const pagination = element.querySelector<HTMLElement>('.board-pagination')!;
    const controls = pagination.querySelector('.board-pagination-controls');

    expect(controls).not.toBeNull();
    expect(controls?.querySelector('.page-size-control')).not.toBeNull();
    expect(controls?.querySelector('.page-navigation')).not.toBeNull();

    takeRequest().flush(response());
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).verify();
  });

  it('expands market subcategories independently and keeps the active subcategory visible', async () => {
    const categories: CatalogCategory[] = [
      { id: 'materials', parentId: null, name: 'Materiais', sortOrder: 1 },
      { id: 'ores', parentId: 'materials', name: 'Minérios', sortOrder: 1 },
      { id: 'wood', parentId: 'materials', name: 'Madeira', sortOrder: 2 },
    ];
    const fixture = await renderMarketBoard(categories);
    takeRequest().flush({ ...response(), categories });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const group = element.querySelector<HTMLElement>('.category-group')!;
    const toggle = group.querySelector<HTMLButtonElement>('.category-expand-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(group.querySelectorAll('.category-children button')).toHaveLength(0);

    group.querySelector<HTMLButtonElement>('.category-filter-button')!.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    takeRequest().flush({ ...response(), categories });
    fixture.detectChanges();

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(group.textContent).toContain('Minérios');
    expect(group.textContent).toContain('Madeira');

    [...group.querySelectorAll<HTMLButtonElement>('.category-filter-button')]
      .find((button) => button.textContent?.includes('Minérios'))!
      .click();
    fixture.detectChanges();
    expect(takeRequest().request.params.get('categoryId')).toBe('ores');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.disabled).toBe(true);
    TestBed.inject(HttpTestingController).verify();
  });

  it('clears search, category, and stock filters in one action', async () => {
    const categories: CatalogCategory[] = [
      { id: 'materials', parentId: null, name: 'Materiais', sortOrder: 1 },
    ];
    const fixture = await renderMarketBoard(categories);
    takeRequest().flush({ ...response(), categories });
    fixture.detectChanges();

    const board = fixture.componentInstance;
    board.filterCategory('materials');
    takeRequest().flush({ ...response(), categories });
    board.setStockFilter('with_volume');
    board.find('Cerveja');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const clear = element.querySelector<HTMLButtonElement>('.btn-clear-filters');
    expect(clear).not.toBeNull();
    clear!.click();
    fixture.detectChanges();

    expect(board.category()).toBe('');
    expect(board.search()).toBe('');
    expect(board.stockFilter()).toBe('all');
    expect(board.page()).toBe(1);
    expect(board.result()?.items[0]?.name).toBe('Cerveja');
    expect(element.querySelector('.btn-clear-filters')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone((request) =>
      request.url.endsWith('/market/board'),
    );
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps absent historical metrics unknown and emits the exact item variant', async () => {
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
    const data = response();
    data.items[0].volume24h = '35';
    takeRequest().flush(data);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('caption')?.textContent).toContain(
      'contagem acumulada de negociações',
    );
    expect(element.querySelector('thead')?.textContent).toContain('Registros 24h');
    expect(element.querySelector('.filter-pills')?.textContent).toContain('Com registros 24h');
    expect(
      element.querySelector('[title*="contador total de negociações"]')?.textContent,
    ).toContain('35');
    expect(element.textContent).not.toContain('unidades negociadas');
    TestBed.inject(HttpTestingController).verify();
  });

  it('filters the complete list before pagination and discards a pending older query', async () => {
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
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
    const fixture = await renderMarketBoard();
    const pending = takeRequest();

    TestBed.inject(RegionPreferences).setRegion('eu');
    fixture.detectChanges();
    const categoryRequests = TestBed.inject(HttpTestingController).match((request) =>
      request.url.endsWith('/categories'),
    );
    expect(categoryRequests).toHaveLength(1);
    categoryRequests[0]?.flush({ categories: [], dataset: null });

    expect(pending.cancelled).toBe(true);
    const euRequest = takeRequest();
    expect(euRequest.request.params.get('region')).toBe('eu');
    euRequest.flush({ ...response(), region: 'eu' });
    expect(fixture.componentInstance.result()?.region).toBe('eu');
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps stale cached results visible when background refresh fails', async () => {
    const fixture = await renderMarketBoard();
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

  it('keeps catalog taxonomy visible through empty and failed category queries', async () => {
    const categories: CatalogCategory[] = [
      { id: 'materials', parentId: null, name: 'Materiais', sortOrder: 1 },
      { id: 'ores', parentId: 'materials', name: 'Minérios', sortOrder: 1 },
    ];
    const fixture = await renderMarketBoard(categories);
    const http = TestBed.inject(HttpTestingController);
    takeRequest().flush({ ...response(), categories });
    fixture.detectChanges();

    const board = fixture.componentInstance;
    board.filterCategory('materials');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.category-list')?.textContent).toContain(
      'Materiais',
    );
    board.toggleCategoryExpansion('materials');
    takeRequest().flush({ ...response(), categories: [], items: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.category-list')?.textContent).toContain(
      'Minérios',
    );

    board.filterCategory('ores');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.category-list')?.textContent).toContain(
      'Materiais',
    );
    takeRequest().flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.category-list')?.textContent).toContain(
      'Minérios',
    );
    http.verify();
  });

  it('does not display the previous search results while the next search is debounced', async () => {
    const fixture = await renderMarketBoard();
    takeRequest().flush(response());

    fixture.componentInstance.find('Edania');

    expect(fixture.componentInstance.result()).toBeNull();
    TestBed.inject(HttpTestingController).expectNone((request) =>
      request.url.endsWith('/market/board'),
    );
  });

  it('debounces search requests by 250 milliseconds', async () => {
    const fixture = await renderMarketBoard();
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
