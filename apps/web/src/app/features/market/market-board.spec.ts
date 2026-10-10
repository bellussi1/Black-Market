import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MarketBoardResponse } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

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
    expect(element.textContent).toContain('Bottom');
    const emit = vi.spyOn(fixture.componentInstance.selected, 'emit');
    element.querySelector<HTMLButtonElement>('.board-item')!.click();
    expect(emit).toHaveBeenCalledWith(data.items[0]);
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
    expect(element.querySelectorAll('tbody td')[2].textContent?.trim()).toBe('—');
    expect(element.querySelector<HTMLOptionElement>('option[value="price"]')?.disabled).toBe(true);
    TestBed.inject(HttpTestingController).verify();
  });
});
