import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { SeoService } from '../../core/seo.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { ItemDetailPage } from './item-detail-page';

describe('ItemDetailPage loading state', () => {
  useMemoryStorage();

  it('reserves the item detail layout while catalog requests are pending', async () => {
    const api = {
      getItem: () => new Subject<unknown>(),
      getItemRecipes: () => new Subject<unknown>(),
      resolveIconUrl: () => null,
    } as unknown as CatalogApiService;
    const fixture = await renderComponent(ItemDetailPage, {}, [
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ id: '9001' })) },
      },
      { provide: CatalogApiService, useValue: api },
      { provide: SeoService, useValue: { unavailable: vi.fn(), describe: vi.fn() } },
    ]);

    const loading = fixture.nativeElement.querySelector('.item-detail-loading-skeleton');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.item-detail-skeleton-row')).toHaveLength(4);
  });
});
