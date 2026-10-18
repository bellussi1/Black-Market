import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { SeoService } from '../../core/seo.service';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
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

  it('starts the market item guide only after the real item details are ready', async () => {
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
    const directive = fixture.debugElement
      .query(By.directive(TutorialSurfaceDirective))
      .injector.get(TutorialSurfaceDirective);

    expect(directive.appTutorialSurface()).toBe('market-item');
    expect(directive.ready()).toBe(false);

    fixture.componentInstance.item.set({
      id: 9001,
      name: 'Material de teste',
      categories: [],
      sourceData: {},
    } as never);
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(directive.ready()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-tour="market-item.summary"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-tour="market-item.history"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-tour="market-item.details"]')).not.toBeNull();
  });
});
