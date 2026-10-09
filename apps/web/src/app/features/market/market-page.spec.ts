import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CatalogItem } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { MarketPage } from './market-page';

describe('MarketPage', () => {
  useMemoryStorage();
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
    page.saveLive(item);
    fixture.detectChanges();
    const quote = TestBed.inject(WorkspaceStore).data().quotes[0];
    expect(quote.source).toBe('arsha');
    expect(quote.itemId).toBe(676);
    expect(quote.history[0].source).toBe('arsha');
    expect(page.form().price).toBe('340000');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Example');
    http.verify();
  });

  it('charts only stored market observations and does not infer daily sale volume', async () => {
    const fixture = await render(MarketPage);
    const page = fixture.componentInstance;
    const now = Date.now();
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
    expect(page.historyChart().points.split(' ')).toHaveLength(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'não fornece uma série confiável de volume ou média de vendas por dia/mês',
    );

    page.historyRange.set('day');
    page.historyMetric.set('totalTrades');
    fixture.detectChanges();
    expect(page.historyChart().samples).toBe(1);
    expect(page.historyChart().points).toBe('');
  });
});
