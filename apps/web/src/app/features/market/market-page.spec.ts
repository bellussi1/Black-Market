import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { MarketPage } from './market-page';

describe('MarketPage', () => {
  useMemoryStorage();
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
});
