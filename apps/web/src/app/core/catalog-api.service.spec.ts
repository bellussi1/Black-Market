import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CatalogRecipe } from '@bdo/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CatalogApiService } from './catalog-api.service';

const recipes = (start: number, count: number): CatalogRecipe[] =>
  Array.from({ length: count }, (_, index) => ({
    key: String(start + index),
    type: 'ALCHEMY',
    station: null,
    inputs: [],
    outputs: [],
  }));
describe('Complete item recipe lookup', () => {
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
