import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ActiveDatasetSummary, CatalogPage, CatalogRecipe } from '@bdo/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from './catalog-api.service';
import { RegionPreferences } from './region-preferences';

const recipes = (start: number, count: number): CatalogRecipe[] =>
  Array.from({ length: count }, (_, index) => ({
    key: String(start + index),
    type: 'ALCHEMY',
    station: null,
    inputs: [],
    outputs: [],
  }));
describe('Complete item recipe lookup', () => {
  it('builds item icon URLs on the API port published by the local app', () => {
    expect(
      TestBed.inject(CatalogApiService).itemIconUrl(1407, {
        version: 'dataset',
        region: 'sa',
        locale: 'pt',
        checksum: 'dataset',
        itemCount: 0,
        recipeCount: 0,
        importedAt: '2026-10-14T00:00:00.000Z',
      }),
    ).toBe('http://localhost:3000/api/v1/items/1407/icon?dataset=dataset');
  });
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });
  function flush(page: number, rows: CatalogRecipe[], total: number, version = 'same') {
    const request = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.url.endsWith('/items/5301/recipes') && r.params.get('page') === String(page),
    );
    expect(request.request.params.get('pageSize')).toBe('100');
    request.flush({
      recipes: rows,
      total,
      page,
      pageSize: 100,
      direction: 'uses',
      dataset: { version },
    });
  }
  it('retrieves all pages including recipes previously hidden by the 50-row limit', () => {
    let keys: string[] = [];
    TestBed.inject(CatalogApiService)
      .getItemRecipes(5301, 'uses')
      .subscribe((result) => {
        keys = result.recipes.map((r) => r.key);
      });
    flush(1, recipes(0, 100), 205);
    flush(2, recipes(100, 100), 205);
    flush(3, recipes(200, 5), 205);
    expect(keys).toHaveLength(205);
    expect(keys.at(-1)).toBe('204');
  });
  it('rejects mixed dataset versions instead of presenting an apparently complete list', () => {
    let message = '';
    TestBed.inject(CatalogApiService)
      .getItemRecipes(5301, 'uses')
      .subscribe({
        error: (error: Error) => {
          message = error.message;
        },
      });
    flush(1, recipes(0, 100), 101);
    flush(2, recipes(100, 1), 101, 'new');
    expect(message).toContain('catálogo mudou');
  });
  it('detects empty or duplicated pages before claiming completeness', () => {
    let message = '';
    TestBed.inject(CatalogApiService)
      .getItemRecipes(5301, 'uses')
      .subscribe({
        error: (error: Error) => {
          message = error.message;
        },
      });
    flush(1, recipes(0, 100), 101);
    flush(2, recipes(0, 1), 101);
    expect(message).toContain('incompleta');
  });
});

describe('Batch byproduct recipe lookup', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('fetches all byproduct relations in one catalog request and checks dataset version', () => {
    let loaded: CatalogRecipe[] = [];
    TestBed.inject(CatalogApiService)
      .getByproductRecipes([749, 690], 'same')
      .subscribe((result) => (loaded = result.recipes));

    const request = TestBed.inject(HttpTestingController).expectOne((r) =>
      r.url.endsWith('/recipes/byproducts'),
    );
    expect(request.request.params.get('ids')).toBe('749,690');
    expect(request.request.params.get('region')).toBe('sa');
    request.flush({
      recipes: recipes(1, 1).map((recipe) => ({ ...recipe, byproductOfItemId: 749 })),
      total: 1,
      direction: 'byproducts',
      dataset: { version: 'same' },
    });
    expect(loaded).toHaveLength(1);
  });

  it('rejects a byproduct response from a different catalog version', () => {
    let message = '';
    TestBed.inject(CatalogApiService)
      .getByproductRecipes([749], 'same')
      .subscribe({ error: (error: Error) => (message = error.message) });

    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/recipes/byproducts'))
      .flush({ recipes: [], total: 0, direction: 'byproducts', dataset: { version: 'new' } });
    expect(message).toContain('catálogo mudou');
  });
});

describe('Batch recipe market equivalent lookup', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('resolves marketable fish forms and checks the active dataset version', () => {
    let equivalents: Array<{ sourceItemId: number; itemId: number }> = [];
    TestBed.inject(CatalogApiService)
      .getRecipeMarketEquivalents([8211, 8211], 'same')
      .subscribe((result) => (equivalents = result));

    const request = TestBed.inject(HttpTestingController).expectOne((r) =>
      r.url.endsWith('/recipe-market-equivalents'),
    );
    expect(request.request.params.get('ids')).toBe('8211');
    request.flush({
      equivalents: [{ sourceItemId: 8211, itemId: 8511, quantityRatio: 1 }],
      dataset: { version: 'same' },
    });
    expect(equivalents).toEqual([{ sourceItemId: 8211, itemId: 8511, quantityRatio: 1 }]);
  });

  it('rejects equivalent data from another catalog version', () => {
    let message = '';
    TestBed.inject(CatalogApiService)
      .getRecipeMarketEquivalents([8211], 'same')
      .subscribe({ error: (error: Error) => (message = error.message) });

    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/recipe-market-equivalents'))
      .flush({ equivalents: [], dataset: { version: 'new' } });
    expect(message).toContain('catálogo mudou');
  });
});

describe('Public catalog in-memory cache', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const dataset = (
    region = 'sa',
    locale = 'pt',
    version = 'v1',
    checksum = version,
  ): ActiveDatasetSummary => ({
    version,
    region,
    locale,
    checksum,
    itemCount: 1,
    recipeCount: 0,
    importedAt: `2026-10-15T00:00:00.000Z`,
  });
  const itemPage = (catalog: ActiveDatasetSummary = dataset()): CatalogPage => ({
    items: [
      {
        id: 1,
        name: `Dataset ${catalog.version}`,
        description: null,
        grade: null,
        weight: null,
        category: null,
        icon: null,
        iconUrl: null,
        categories: [],
      },
    ],
    total: 1,
    page: 1,
    pageSize: 24,
    dataset: catalog,
  });

  it('serves a fresh item page from memory without a second network request', () => {
    const service = TestBed.inject(CatalogApiService);
    const http = TestBed.inject(HttpTestingController);
    const params = { page: 1, pageSize: 24 };
    let results: CatalogPage[] = [];
    service.getItems(params).subscribe((page) => results.push(page));
    http.expectOne((request) => request.url.endsWith('/items')).flush(itemPage());

    service.getItems(params).subscribe((page) => results.push(page));

    http.expectNone((request) => request.url.endsWith('/items'));
    expect(results.map((page) => page.items[0]?.name)).toEqual(['Dataset v1', 'Dataset v1']);
  });

  it('shares an in-flight item-page request between identical callers', () => {
    const service = TestBed.inject(CatalogApiService);
    const http = TestBed.inject(HttpTestingController);
    const params = { page: 1, pageSize: 24 };
    const results: CatalogPage[] = [];
    service.getItems(params).subscribe((page) => results.push(page));
    service.getItems(params).subscribe((page) => results.push(page));

    const requests = http.match((request) => request.url.endsWith('/items'));
    expect(requests).toHaveLength(1);
    requests.forEach((request) => request.flush(itemPage()));
    expect(results).toHaveLength(2);
  });

  it('separates cached reads by region, locale, endpoint, and effective parameters', () => {
    const service = TestBed.inject(CatalogApiService);
    const http = TestBed.inject(HttpTestingController);
    const preferences = TestBed.inject(RegionPreferences);
    preferences.setRegion('sa');
    service.getItems({ page: 1, pageSize: 24 }).subscribe();
    const initialRequest = http.expectOne((request) => request.url.endsWith('/items'));
    const initialLocale = initialRequest.request.params.get('preferredLocale');

    vi.stubGlobal(
      '$localize',
      Object.assign(() => '', { locale: 'en-US' }),
    );
    service.getItems({ page: 1, pageSize: 24 }).subscribe();
    preferences.setRegion('eu');
    service.getItems({ page: 1, pageSize: 24 }).subscribe();
    service.getItems({ page: 2, pageSize: 24 }).subscribe();
    service.getCategories().subscribe();

    const requests = http.match(() => true);
    expect(requests).toHaveLength(4);
    expect(requests.map((request) => request.request.params.get('region'))).toEqual([
      'sa',
      'eu',
      'eu',
      'eu',
    ]);
    expect(requests[0]?.request.params.get('preferredLocale')).not.toBe(initialLocale);
    expect(requests[2]?.request.params.get('page')).toBe('2');
    expect(requests[3]?.request.url).toContain('/categories');
    initialRequest.flush(itemPage(dataset('sa', initialLocale ?? 'pt')));
    requests.forEach((request) => {
      const region = request.request.params.get('region') ?? 'sa';
      const locale = request.request.params.get('preferredLocale') ?? 'pt';
      request.flush(
        request.request.url.endsWith('/categories')
          ? { categories: [], dataset: dataset(region, locale) }
          : itemPage(dataset(region, locale)),
      );
    });
  });

  it('invalidates entries from an older dataset version when a newer response is observed', () => {
    const service = TestBed.inject(CatalogApiService);
    const http = TestBed.inject(HttpTestingController);
    const params = { page: 1, pageSize: 24 };
    service.getItems(params).subscribe();
    http
      .expectOne((request) => request.url.endsWith('/items'))
      .flush(itemPage(dataset('sa', 'pt', 'v1', 'checksum-1')));
    service.getCategories().subscribe();
    http
      .expectOne((request) => request.url.endsWith('/categories'))
      .flush({ categories: [], dataset: dataset('sa', 'pt', 'v2', 'checksum-2') });

    let version = '';
    service.getItems(params).subscribe((page) => (version = page.dataset?.version ?? ''));
    http
      .expectOne((request) => request.url.endsWith('/items'))
      .flush(itemPage(dataset('sa', 'pt', 'v2', 'checksum-2')));
    expect(version).toBe('v2');
  });

  it('emits expired data before refresh and keeps it available after a refresh failure', async () => {
    const { DEFAULT_MARKET_CACHE_TTL_MS } = await import('./market-cache.service');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    const service = TestBed.inject(CatalogApiService);
    const http = TestBed.inject(HttpTestingController);
    const params = { page: 1, pageSize: 24 };
    const emissions: CatalogPage[] = [];
    let errors = 0;
    service.getItems(params).subscribe((page) => emissions.push(page));
    http.expectOne((request) => request.url.endsWith('/items')).flush(itemPage());

    vi.setSystemTime(new Date(Date.now() + DEFAULT_MARKET_CACHE_TTL_MS + 1));
    service.getItems(params).subscribe({
      next: (page) => emissions.push(page),
      error: () => errors++,
    });
    expect(emissions.at(-1)?.items[0]?.name).toBe('Dataset v1');
    http
      .expectOne((request) => request.url.endsWith('/items'))
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(errors).toBe(1);

    service.getItems(params).subscribe((page) => emissions.push(page));
    expect(emissions.at(-1)?.items[0]?.name).toBe('Dataset v1');
    http
      .expectOne((request) => request.url.endsWith('/items'))
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(emissions).toHaveLength(3);
  });
});
