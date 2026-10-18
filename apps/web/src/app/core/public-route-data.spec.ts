import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  convertToParamMap,
  type RouterStateSnapshot,
} from '@angular/router';
import type { CatalogRecipe } from '@bdo/shared';
import { firstValueFrom, NEVER, type Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from './catalog-api.service';
import { MarketCacheService } from './market-cache.service';
import {
  marketRouteResolver,
  PublicRouteData,
  type PublicRouteWarmResult,
  recipesRouteResolver,
  recommendationsRouteResolver,
} from './public-route-data';
import { RegionPreferences } from './region-preferences';

const recipe = (itemId: number): CatalogRecipe => ({
  key: 'a'.repeat(64),
  type: 'COOKING',
  station: null,
  inputs: [],
  outputs: [{ itemId, name: 'Produto de teste', quantity: '1' }],
});

function setup() {
  const catalog = {
    getCategories: vi.fn(() => of({ categories: [], dataset: null })),
    getProductionCatalog: vi.fn(() => of({ recipes: [], items: [], dataset: { version: 'v1' } })),
    getRecipes: vi.fn(() => of({ recipes: [], page: 1, pageSize: 24, total: 0, dataset: null })),
    getItem: vi.fn(() => of({ item: { id: 1407 }, dataset: { version: 'v1' } })),
    getItemRecipes: vi.fn(() =>
      of({ recipes: [], direction: 'produces', total: 0, dataset: null }),
    ),
    getRecipe: vi.fn(() => of({ recipe: recipe(1407), dataset: { version: 'v1' } })),
  };
  const marketCache = {
    resolveBoard: vi.fn(() => of({ response: { items: [] }, expiresAt: Date.now() })),
  };
  TestBed.configureTestingModule({
    providers: [
      PublicRouteData,
      { provide: CatalogApiService, useValue: catalog },
      { provide: MarketCacheService, useValue: marketCache },
      { provide: RegionPreferences, useValue: { region: () => 'sa' } },
    ],
  });
  return { service: TestBed.inject(PublicRouteData), catalog, marketCache };
}

describe('Public route data warming', () => {
  it('does not block browser activation on pending public requests', async () => {
    const prefetchPath = vi.fn(() => NEVER);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: PublicRouteData, useValue: { prefetchPath } },
      ],
    });
    const route = {
      paramMap: convertToParamMap({}),
      queryParamMap: convertToParamMap({}),
    } as ActivatedRouteSnapshot;
    for (const resolver of [
      marketRouteResolver,
      recommendationsRouteResolver,
      recipesRouteResolver,
    ]) {
      let result: PublicRouteWarmResult | undefined;
      const subscription = TestBed.runInInjectionContext(
        () => resolver(route, {} as RouterStateSnapshot) as Observable<PublicRouteWarmResult>,
      ).subscribe((value) => (result = value));
      expect(result).toEqual({ status: 'ignored' });
      subscription.unsubscribe();
    }
    expect(prefetchPath).not.toHaveBeenCalled();
  });

  it('routes both market and recipe resolvers through the shared public cache service', async () => {
    const prefetchPath = vi.fn((_path: string) => of({ status: 'ready' as const }));
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: PublicRouteData, useValue: { prefetchPath } },
      ],
    });
    const snapshot = (params: Record<string, string>) =>
      ({
        paramMap: convertToParamMap(params),
        queryParamMap: convertToParamMap({}),
      }) as ActivatedRouteSnapshot;

    await firstValueFrom(
      TestBed.runInInjectionContext(
        () =>
          marketRouteResolver(
            snapshot({}),
            {} as RouterStateSnapshot,
          ) as Observable<PublicRouteWarmResult>,
      ),
    );
    await firstValueFrom(
      TestBed.runInInjectionContext(
        () =>
          recommendationsRouteResolver(
            snapshot({}),
            {} as RouterStateSnapshot,
          ) as Observable<PublicRouteWarmResult>,
      ),
    );
    await firstValueFrom(
      TestBed.runInInjectionContext(
        () =>
          recipesRouteResolver(
            snapshot({ id: '1407' }),
            {} as RouterStateSnapshot,
          ) as Observable<PublicRouteWarmResult>,
      ),
    );
    await firstValueFrom(
      TestBed.runInInjectionContext(
        () =>
          recipesRouteResolver(
            snapshot({ key: 'b'.repeat(64) }),
            {} as RouterStateSnapshot,
          ) as Observable<PublicRouteWarmResult>,
      ),
    );

    expect(prefetchPath.mock.calls.map(([path]) => path)).toEqual([
      '/market',
      '/recommendations',
      '/recipes/items/1407',
      `/recipes/${'b'.repeat(64)}`,
    ]);
  });

  it('warms the production snapshot for the active region without accessing workspace data', async () => {
    const { service, catalog } = setup();

    await expect(firstValueFrom(service.prefetchPath('/recommendations'))).resolves.toEqual({
      status: 'ready',
    });
    expect(catalog.getProductionCatalog).toHaveBeenCalledWith('sa');
  });

  it('warms the default market board and stable catalog taxonomy', async () => {
    const { service, catalog, marketCache } = setup();

    await expect(firstValueFrom(service.prefetchPath('/market'))).resolves.toEqual({
      status: 'ready',
    });
    expect(catalog.getCategories).toHaveBeenCalledOnce();
    expect(marketCache.resolveBoard).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'sa', categoryId: '', page: 1, pageSize: 20 }),
    );
  });

  it('warms the first recipe page, item detail and producing methods by route', async () => {
    const { service, catalog } = setup();

    await firstValueFrom(service.prefetchPath('/recipes'));
    await firstValueFrom(service.prefetchPath('/recipes/items/1407'));
    expect(catalog.getRecipes).toHaveBeenCalledWith('', 1);
    expect(catalog.getItem).toHaveBeenCalledWith(1407);
    expect(catalog.getItemRecipes).toHaveBeenCalledWith(1407, 'produces');
  });

  it('warms a selected recipe, its product and the product methods', async () => {
    const { service, catalog } = setup();

    await firstValueFrom(service.prefetchPath(`/recipes/${'a'.repeat(64)}`));
    expect(catalog.getRecipe).toHaveBeenCalledWith('a'.repeat(64));
    expect(catalog.getItem).toHaveBeenCalledWith(1407);
    expect(catalog.getItemRecipes).toHaveBeenCalledWith(1407, 'produces');
  });

  it('returns a recoverable not-found state for malformed or missing targets', async () => {
    const { service, catalog } = setup();

    await expect(firstValueFrom(service.prefetchPath('/recipes/items/0'))).resolves.toEqual({
      status: 'not-found',
    });
    await expect(
      firstValueFrom(service.prefetchPath('/recipes/not-a-recipe-key')),
    ).resolves.toEqual({
      status: 'not-found',
    });
    await expect(firstValueFrom(service.prefetchPath('/recipes/private/1'))).resolves.toEqual({
      status: 'ignored',
    });
    expect(catalog.getItem).not.toHaveBeenCalled();
    expect(catalog.getRecipe).not.toHaveBeenCalled();
  });

  it('recovers from upstream failures and shares duplicate route warming', async () => {
    const { service, catalog } = setup();
    const pending = new Subject<unknown>();
    catalog.getRecipes.mockReturnValue(pending as never);

    const first = firstValueFrom(service.prefetchPath('/recipes'));
    const second = firstValueFrom(service.prefetchPath('/recipes/'));
    expect(catalog.getRecipes).toHaveBeenCalledOnce();
    pending.next({ recipes: [], page: 1, pageSize: 24, total: 0, dataset: null });
    pending.complete();
    await expect(first).resolves.toEqual({ status: 'ready' });
    await expect(second).resolves.toEqual({ status: 'ready' });

    catalog.getRecipes.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })) as never,
    );
    await expect(firstValueFrom(service.prefetchPath('/recipes?page=2'))).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
