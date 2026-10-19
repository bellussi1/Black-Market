import type { CatalogPage } from '@bdo/shared';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { ItemCatalogPage } from './item-catalog-page';

describe('catalog product analytics', () => {
  useMemoryStorage();

  it('uses the shared page container and exposes catalog search as the primary action', async () => {
    const catalog = {
      getCategories: () => of({ categories: [] }),
      getItems: () => of({ items: [], total: 0, dataset: null }),
      resolveIconUrl: () => null,
    } as unknown as CatalogApiService;
    const fixture = await renderComponent(ItemCatalogPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
      { provide: AnalyticsService, useValue: { capture: vi.fn() } },
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.catalog-shell.tool-page')).not.toBeNull();
    expect(element.querySelector('h1#catalog-title')?.textContent).toContain('Catálogo de itens');
    expect(element.querySelector('.catalog-tools input[type="search"]')).not.toBeNull();
    expect(element.querySelector('.catalog-results')).not.toBeNull();
  });

  it('records search outcomes and detail opens without the query or item identity', async () => {
    const capture = vi.fn();
    const item = {
      id: 9001,
      name: 'Confidential example item',
      iconUrl: null,
      description: null,
      categories: [],
      grade: null,
      weight: null,
    };
    const catalog = {
      getCategories: () => of({ categories: [] }),
      getItems: vi.fn((params: { q?: string }) =>
        of({ items: [], total: params.q ? 0 : 1, dataset: null }),
      ),
      getItem: () => of({ item: { item }, dataset: null }),
      getItemRecipes: () => of({ recipes: [], total: 0 }),
      resolveIconUrl: () => null,
    } as unknown as CatalogApiService;
    const fixture = await renderComponent(ItemCatalogPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
      { provide: AnalyticsService, useValue: { capture } },
    ]);
    const page = fixture.componentInstance;

    page.searchFor('private search phrase');
    expect(capture.mock.calls).toEqual([
      ['journey_started', { feature: 'catalog', action: 'search' }],
      [
        'journey_completed',
        {
          feature: 'catalog',
          action: 'search',
          status: 'success',
          result: 'no_matches',
        },
      ],
    ]);

    page.openItem(item as never);
    expect(capture).toHaveBeenLastCalledWith('item_detail_opened', { feature: 'catalog' });
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(
      /private search phrase|9001|Confidential/i,
    );
  });

  it('keeps the same item-grid footprint with an accessible skeleton during pagination', async () => {
    const requests: Subject<CatalogPage>[] = [];
    const catalog = {
      getCategories: () => of({ categories: [] }),
      getItems: () => {
        const request = new Subject<CatalogPage>();
        requests.push(request);
        return request;
      },
      resolveIconUrl: () => null,
    } as unknown as CatalogApiService;
    const fixture = await renderComponent(ItemCatalogPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
      { provide: AnalyticsService, useValue: { capture: vi.fn() } },
    ]);
    const page = fixture.componentInstance;
    const initialResults = fixture.nativeElement.querySelector('.catalog-results');

    expect(initialResults?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.item-skeleton')).toHaveLength(page.pageSize);
    expect(fixture.nativeElement.querySelector('.catalog-loading-status')?.textContent).toContain(
      'Carregando itens',
    );

    const dataset = {
      version: 'test-dataset',
      region: 'sa',
      locale: 'pt',
      checksum: null,
      itemCount: 96,
      recipeCount: 0,
      importedAt: '2026-10-16T00:00:00.000Z',
    };
    requests[0]?.next({
      items: Array.from({ length: page.pageSize }, (_, id) => ({
        id: id + 1,
        name: `Item ${id + 1}`,
        description: null,
        grade: null,
        weight: null,
        category: null,
        icon: null,
        categories: [],
      })),
      total: 96,
      page: 1,
      pageSize: page.pageSize,
      dataset,
    });
    requests[0]?.complete();
    fixture.detectChanges();

    page.page.set(2);
    page.loading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.catalog-results')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(fixture.nativeElement.querySelectorAll('.item-skeleton')).toHaveLength(page.pageSize);
    expect(fixture.nativeElement.querySelectorAll('.item-card')).toHaveLength(0);
  });

  it('keeps the category filter height stable while its taxonomy loads', async () => {
    const categoryRequest = new Subject<unknown>();
    const catalog = {
      getCategories: () => categoryRequest,
      getItems: () => of({ items: [], total: 0, page: 1, pageSize: 48, dataset: null }),
      resolveIconUrl: () => null,
    } as unknown as CatalogApiService;
    const fixture = await renderComponent(ItemCatalogPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
      { provide: AnalyticsService, useValue: { capture: vi.fn() } },
    ]);

    const slot = fixture.nativeElement.querySelector('.catalog-category-loading-slot');
    expect(slot?.getAttribute('aria-busy')).toBe('true');
    expect(
      fixture.nativeElement.querySelector('.catalog-category-loading-status')?.textContent,
    ).toContain('Carregando categorias');

    categoryRequest.next({ categories: [], dataset: null });
    categoryRequest.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.catalog-category-loading-status')).toBeNull();
  });

  it('reserves recipe rows while item details are loading', async () => {
    const itemRequest = new Subject<unknown>();
    const recipeRequests = [new Subject<unknown>(), new Subject<unknown>()];
    const item = {
      id: 9001,
      name: 'Example item',
      iconUrl: null,
      description: null,
      categories: [],
      grade: null,
      weight: null,
    };
    const catalog = {
      getCategories: () => of({ categories: [] }),
      getItems: () => of({ items: [item], total: 1, page: 1, pageSize: 48, dataset: null }),
      getItem: () => itemRequest,
      getItemRecipes: vi.fn(() => recipeRequests.shift() ?? new Subject<unknown>()),
      resolveIconUrl: () => null,
    } as unknown as CatalogApiService;
    const fixture = await renderComponent(ItemCatalogPage, {}, [
      { provide: CatalogApiService, useValue: catalog },
      { provide: AnalyticsService, useValue: { capture: vi.fn() } },
    ]);

    fixture.componentInstance.openItem(item as never);
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('.detail-recipes-skeleton');
    expect(skeleton?.getAttribute('role')).toBe('status');
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.detail-recipe-skeleton-row')).toHaveLength(4);
  });
});
