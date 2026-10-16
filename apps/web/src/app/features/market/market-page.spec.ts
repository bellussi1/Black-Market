import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CatalogItem, MarketBoardItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { MarketPage } from './market-page';

async function render(component: typeof MarketPage) {
  const fixture = await renderComponent(component);
  const http = TestBed.inject(HttpTestingController);
  http
    .expectOne((request) => request.url.endsWith('/market/board'))
    .flush({
      source: 'arsha',
      region: 'sa',
      locale: 'pt',
      fetchedAt: new Date().toISOString(),
      cacheStatus: 'cached',
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      categories: [],
    });
  http.expectOne((request) => request.url.endsWith('/categories')).flush({ categories: [] });
  fixture.detectChanges();
  return fixture;
}

describe('MarketPage', () => {
  useMemoryStorage();
  it('targets the local API on the published port for market queries', async () => {
    await renderComponent(MarketPage);
    const request = TestBed.inject(HttpTestingController).expectOne(
      (candidate) => candidate.url === 'http://localhost:3000/api/v1/market/board',
    );
    request.flush({
      source: 'arsha',
      region: 'sa',
      locale: 'pt',
      fetchedAt: new Date().toISOString(),
      cacheStatus: 'cached',
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      categories: [],
    });
  });
  it('opens the central market with hot items and selectable page sizes', async () => {
    const fixture = await render(MarketPage);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Itens em alta');
    expect(element.querySelector<HTMLSelectElement>('[aria-label="Itens por página"]')?.value).toBe(
      '20',
    );
    expect(
      Array.from(element.querySelectorAll('[aria-label="Itens por página"] option'), (option) =>
        option.textContent?.trim(),
      ),
    ).toEqual(['20', '50', '100']);
    expect(element.textContent).not.toContain('Encontre sua próxima compra ou venda');
  });
  it('consults selected items automatically and shares tax preferences without losing the search', async () => {
    const fixture = await render(MarketPage),
      page = fixture.componentInstance;
    page.selectItem({
      id: 676,
      name: 'Item',
      categories: [],
      category: 'Material',
      iconUrl: null,
    } as unknown as CatalogItem);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/api/v1/market/items/676?region=sa&locale=pt').flush({
      source: 'arsha',
      region: 'sa',
      fetchedAt: new Date().toISOString(),
      cacheStatus: 'cached',
      items: [],
    });
    http.expectOne((request) => request.url.endsWith('/676/history')).flush({ points: [] });
    page.setValuePack(true);
    expect(page.netPrice('10000')).toBe('8450');
    expect(page.store.data().taxOptions.valuePack).toBe(true);
    page.priceView.set('net');
    expect(page.lookupId()).toBe('676');
    http.verify();
  });
  it('queries by ID through our API and saves provenance for a price above zero', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    page.lookupId.set('676');
    page.lookup();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(
      'http://localhost:3000/api/v1/market/items/676?region=sa&locale=pt',
    );
    const item = {
      itemId: 676,
      subId: 0,
      name: 'Example',
      price: '340000',
      stock: 3,
      totalTrades: '50',
      minPrice: '1',
      maxPrice: '500000',
      lastSoldPrice: null,
      lastSoldAt: null,
    };
    request.flush({
      source: 'arsha',
      region: 'sa',
      fetchedAt: '2026-10-07T12:00:00Z',
      cacheStatus: 'fetched',
      upstreamCacheMinutes: 30,
      items: [item],
    });
    http.expectOne((request) => request.url.endsWith('/676/history')).flush({ points: [] });
    page.workspaceView.set('quote');
    page.saveLive(item);
    fixture.detectChanges();
    const quote = TestBed.inject(WorkspaceStore).data().quotes[0];
    expect(quote.source).toBe('arsha');
    expect(quote.itemId).toBe(676);
    expect(quote.history[0].source).toBe('arsha');
    expect(page.form().price).toBe('340000');
    expect(page.workspaceView()).toBe('quote');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Example');
    page.workspaceView.set('quote');
    fixture.detectChanges();
    expect(page.live()?.items[0].price).toBe('340000');
    expect(page.form().price).toBe('340000');
    const dataset = { version: 'test-dataset' };
    http
      .expectOne((r) => r.url.endsWith('/items/676'))
      .flush({ item: { id: 676, name: 'Example', categories: [] }, dataset });
    http
      .expectOne((r) => r.url.endsWith('/items/676/recipes'))
      .flush({ recipes: [], total: 0, dataset });
    http.verify();
  });

  it('calculates directly from the current quote without saving it first', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    const observedAt = '2026-10-14T12:00:00.000Z';
    page.live.set({
      source: 'arsha',
      region: 'sa',
      locale: 'pt',
      fetchedAt: observedAt,
      cacheStatus: 'fetched',
      upstreamCacheMinutes: 30,
      items: [
        {
          itemId: 676,
          subId: 0,
          name: 'Example',
          price: '340000',
          stock: 3,
          totalTrades: '50',
          minPrice: '1',
          maxPrice: '500000',
          lastSoldPrice: null,
          lastSoldAt: null,
        },
      ],
    });
    page.workspaceView.set('quote');
    fixture.detectChanges();

    const calculate = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.quote-actions button',
    );
    expect(calculate).toBeTruthy();
    calculate?.click();
    fixture.detectChanges();

    expect(page.workspaceView()).toBe('calculator');
    expect(page.form().price).toBe('340000');
    expect(page.store.data().quotes).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Example');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('340.000');
  });

  it('saves a fresh market quote from its detail without leaving the quote view', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    page.live.set({
      source: 'arsha',
      region: 'sa',
      locale: 'pt',
      fetchedAt: '2026-10-14T12:00:00.000Z',
      cacheStatus: 'fetched',
      upstreamCacheMinutes: 30,
      items: [
        {
          itemId: 676,
          subId: 0,
          name: 'Example',
          price: '340000',
          stock: 3,
          totalTrades: '50',
          minPrice: '1',
          maxPrice: '500000',
          lastSoldPrice: null,
          lastSoldAt: null,
        },
      ],
    });
    page.workspaceView.set('quote');
    fixture.detectChanges();

    const save = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.quote-actions button:last-child',
    );
    expect(save).toBeTruthy();
    save?.click();
    fixture.detectChanges();

    expect(page.workspaceView()).toBe('quote');
    expect(page.store.data().quotes).toHaveLength(1);
    expect(page.store.data().quotes[0]).toMatchObject({
      itemId: 676,
      price: '340000',
      region: 'sa',
      source: 'arsha',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cotação salva');
  });

  it('keeps the calculation and search when switching tools through the navigation', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    page.patch({ price: '10000', quantity: 3 });
    page.lookupId.set('676');
    const tabs = element.querySelectorAll<HTMLButtonElement>('.workspace-tabs button');
    tabs[2].click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Calculadora de imposto');
    expect(element.textContent).not.toContain('Buscar item e consultar mercado');
    tabs[3].click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Minhas cotações');
    tabs[1].click();
    fixture.detectChanges();
    expect(page.lookupId()).toBe('676');
    expect(page.form().price).toBe('10000');
    expect(page.form().quantity).toBe(3);
  });

  it('charts stored market observations without presenting trade counts as sold units or liquidity', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    const now = Date.now();
    page.workspaceView.set('quote');
    page.history.set([
      {
        fetchedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
        price: '1000',
        stock: 5,
        totalTrades: '22',
      },
      {
        fetchedAt: new Date(now - 60 * 60 * 1000).toISOString(),
        price: '1200',
        stock: 3,
        totalTrades: '25',
      },
    ]);
    page.historyRange.set('week');
    page.historyMetric.set('price');
    fixture.detectChanges();

    expect(page.historyChart().samples).toBe(2);
    expect(page.historyChart().segments).toHaveLength(2);
    expect(page.historyMetricLabel()).toBe('Preço de venda');
    const chart = (fixture.nativeElement as HTMLElement).querySelector('canvas[role="img"]');
    expect(chart?.getAttribute('aria-label')).toContain('2 observações no período');

    page.historyRange.set('day');
    page.historyMetric.set('volume');
    fixture.detectChanges();
    expect(page.historyChart().samples).toBe(0);
    expect(page.historyChart().segments).toEqual([]);
    expect(page.historyMetricLabel()).toBe('Negociações registradas por intervalo');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'unidades por intervalo',
    );
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'giro estimado do estoque',
    );
  });

  it('loads the selected enhancement history and resolves summary rows to an actual variant', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const selected = {
      itemId: 676,
      subId: 3,
      name: 'Item',
      iconUrl: null,
      categories: [],
    } as unknown as MarketBoardItem;
    const quote = { itemId: 676, subId: 3, name: 'Item', price: '1000', stock: 5 };
    page.selectBoardItem(selected);
    http
      .expectOne((request) => request.url.endsWith('/market/items/676'))
      .flush({
        region: 'sa',
        fetchedAt: new Date().toISOString(),
        cacheStatus: 'fetched',
        items: [quote],
      });
    const variant = http.expectOne((request) => request.url.endsWith('/676/history'));
    expect(variant.request.params.get('subId')).toBe('3');
    variant.flush({ points: [] });

    page.selectBoardItem({ ...selected, subId: 0, quoteScope: 'summary' });
    http
      .expectOne((request) => request.url.endsWith('/market/items/676'))
      .flush({
        region: 'sa',
        fetchedAt: new Date().toISOString(),
        cacheStatus: 'fetched',
        items: [{ ...quote, subId: 5 }],
      });
    const summaryVariant = http.expectOne((request) => request.url.endsWith('/676/history'));
    expect(summaryVariant.request.params.get('subId')).toBe('5');
    summaryVariant.flush({ points: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#market-history > details').open).toBe(true);
    http.verify();
  });
});
