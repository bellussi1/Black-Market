import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { MarketProduction } from './market-production';

const dataset = {
  region: 'sa',
  locale: 'pt',
  version: 'verified-fixture',
  importedAt: '2026-10-11T00:00:00Z',
  checksum: null,
  itemCount: 1,
  recipeCount: 0,
};

describe('MarketProduction', () => {
  useMemoryStorage();
  it('reserves the recipe summary and announces loading while formulas are pending', async () => {
    const fixture = await renderComponent(MarketProduction, { itemId: '676' });
    const loading = fixture.nativeElement.querySelector('.market-production-loading');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.market-production-skeleton-row')).toHaveLength(
      3,
    );
  });

  it('explains missing formulas without inventing hourly profit', async () => {
    const fixture = await renderComponent(MarketProduction, { itemId: '676' });
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/items/676'))
      .flush({ item: { id: 676, name: 'Cerveja', categories: [] }, dataset });
    http
      .expectOne((r) => r.url.endsWith('/items/676/recipes'))
      .flush({ recipes: [], total: 0, dataset });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sem fórmula de produção');
    expect(fixture.nativeElement.querySelector('app-recipe-tree')).toBeNull();
    http.verify();
  });
  it('does not apply the base recipe to enhanced variants', async () => {
    const fixture = await renderComponent(MarketProduction, { itemId: '676', subId: 4 });
    expect(fixture.nativeElement.textContent).toContain('custos de aprimoramento');
    TestBed.inject(HttpTestingController).verify();
  });
  it('rejects formulas from a different dataset', async () => {
    const fixture = await renderComponent(MarketProduction, { itemId: '676' });
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/items/676'))
      .flush({ item: { id: 676, name: 'Cerveja', categories: [] }, dataset });
    http
      .expectOne((r) => r.url.endsWith('/items/676/recipes'))
      .flush({ recipes: [], total: 0, dataset: { ...dataset, version: 'another-version' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('O catálogo mudou');
    expect(fixture.componentInstance.recipe()).toBeNull();
    http.verify();
  });
  it('clears the previous item when the next query fails', async () => {
    const fixture = await renderComponent(MarketProduction, { itemId: '676' });
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.endsWith('/items/676'))
      .flush({ item: { id: 676, name: 'Cerveja', categories: [] }, dataset });
    http
      .expectOne((r) => r.url.endsWith('/items/676/recipes'))
      .flush({ recipes: [], total: 0, dataset });
    fixture.componentRef.setInput('itemId', '5301');
    fixture.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/items/5301'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.item()).toBeNull();
    expect(fixture.componentInstance.message()).toContain('Não foi possível');
    http.verify({ ignoreCancelled: true });
  });
});
