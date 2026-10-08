import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { ItemCatalogPage } from './item-catalog-page';

describe('catalog product analytics', () => {
  useMemoryStorage();

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
});
