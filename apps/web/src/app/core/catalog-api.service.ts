import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ActiveDatasetSummary,
  CatalogCategoriesResponse,
  CatalogItem,
  CatalogItemDetail,
  CatalogPage,
  CatalogRecipe,
  CatalogRecipesResponse,
  LifeSkillRecipeGroup,
  NpcPurchasePrice,
  NpcPurchasePricesResponse,
  ProductionCatalogResponse,
  RecipeListResponse,
  RecipeMarketEquivalent,
  RecipeMarketEquivalentsResponse,
} from '@bdo/shared';
import {
  concat,
  defer,
  EMPTY,
  expand,
  finalize,
  forkJoin,
  map,
  type Observable,
  of,
  reduce,
  shareReplay,
  tap,
} from 'rxjs';

import { environment } from '../../environments/environment';
import { preferredDataLocale } from './locale';
import { DEFAULT_MARKET_CACHE_TTL_MS } from './market-cache.service';
import { type Region, RegionPreferences } from './region-preferences';

export interface CatalogSearchParams {
  ids?: readonly number[];
  q?: string;
  categoryId?: string;
  grade?: string;
  scope?: 'life-skill';
  page: number;
  pageSize: number;
}

export interface CatalogItemResponse {
  item: CatalogItemDetail;
  dataset: ActiveDatasetSummary;
}

type IconResolvable = {
  iconUrl?: string | null;
  id?: number;
  itemId?: number;
};

interface PublicCatalogCacheEntry<T> {
  scope: string;
  value: T;
  fetchedAt: number;
  expiresAt: number;
}

const MAX_PUBLIC_CATALOG_CACHE_ENTRIES = 120;

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly preferences = inject(RegionPreferences);
  private readonly document = inject(DOCUMENT);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;
  private readonly itemIconUrls = new Map<string, string>();
  private readonly publicReadCache = new Map<string, PublicCatalogCacheEntry<unknown>>();
  private readonly publicReadInflight = new Map<string, Observable<unknown>>();
  private readonly activeDatasetIdentity = new Map<string, string>();
  private activeIconChecksum: string | null = null;

  private cachedPublicRead<T>(
    endpoint: string,
    params: HttpParams,
    load: () => Observable<T>,
    getDataset: (value: T) => ActiveDatasetSummary | null | undefined,
  ): Observable<T> {
    const region = params.get('region') ?? this.preferences.region();
    const locale = params.get('preferredLocale') ?? preferredDataLocale();
    const scope = `${region}:${locale}`;
    const identity = this.activeDatasetIdentity.get(scope) ?? 'unknown';
    const paramsKey = params
      .keys()
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${(params.getAll(key) ?? [])
            .map(encodeURIComponent)
            .sort()
            .join(',')}`,
      )
      .join('&');
    const key = `${scope}|${identity}|${endpoint}|${paramsKey}`;
    const now = Date.now();
    const cached = this.publicReadCache.get(key) as PublicCatalogCacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      this.publicReadCache.delete(key);
      this.publicReadCache.set(key, cached);
      return of(cached.value);
    }

    let refresh = this.publicReadInflight.get(key) as Observable<T> | undefined;
    if (!refresh) {
      refresh = defer(load).pipe(
        tap((value) => {
          const dataset = getDataset(value);
          const nextIdentity = dataset
            ? `${dataset.version}:${dataset.checksum ?? ''}`
            : (this.activeDatasetIdentity.get(scope) ?? 'unknown');
          const previousIdentity = this.activeDatasetIdentity.get(scope);
          if (dataset && previousIdentity && previousIdentity !== nextIdentity) {
            for (const [cachedKey, entry] of this.publicReadCache) {
              if (entry.scope === scope) this.publicReadCache.delete(cachedKey);
            }
          }
          if (dataset) this.activeDatasetIdentity.set(scope, nextIdentity);

          const responseKey = `${scope}|${nextIdentity}|${endpoint}|${paramsKey}`;
          this.publicReadCache.delete(responseKey);
          this.publicReadCache.set(responseKey, {
            scope,
            value,
            fetchedAt: Date.now(),
            expiresAt: Date.now() + DEFAULT_MARKET_CACHE_TTL_MS,
          });
          while (this.publicReadCache.size > MAX_PUBLIC_CATALOG_CACHE_ENTRIES) {
            const oldestKey = this.publicReadCache.keys().next().value;
            if (oldestKey === undefined) break;
            this.publicReadCache.delete(oldestKey);
          }
        }),
        finalize(() => this.publicReadInflight.delete(key)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.publicReadInflight.set(key, refresh);
    }

    return cached ? concat(of(cached.value), refresh) : refresh;
  }

  resolveIconUrl(item: IconResolvable): string | null {
    const itemId = item.id ?? item.itemId;
    const iconUrl =
      item.iconUrl ??
      (itemId && this.activeIconChecksum
        ? this.itemIconUrls.get(`${this.activeIconChecksum}:${itemId}`)
        : null);
    return iconUrl ? new URL(iconUrl, environment.apiBaseUrl || this.document.baseURI).href : null;
  }

  private rememberItemIcons(
    items: readonly { id: number; iconUrl?: string | null }[],
    dataset: ActiveDatasetSummary | null | undefined,
  ): void {
    if (dataset?.checksum) this.activeIconChecksum = dataset.checksum;
    const checksum = dataset?.checksum ?? this.activeIconChecksum;
    if (!checksum) return;

    for (const item of items) {
      if (!item.iconUrl) continue;
      const key = `${checksum}:${item.id}`;
      this.itemIconUrls.delete(key);
      this.itemIconUrls.set(key, item.iconUrl);
      if (this.itemIconUrls.size > 5000)
        this.itemIconUrls.delete(this.itemIconUrls.keys().next().value!);
    }
  }

  private rememberRecipeIcons(
    recipes: readonly CatalogRecipe[],
    dataset: ActiveDatasetSummary | null | undefined,
  ): void {
    this.rememberItemIcons(
      recipes.flatMap((recipe) =>
        [...recipe.inputs, ...recipe.outputs].map((part) => ({
          id: part.itemId,
          iconUrl: part.iconUrl,
        })),
      ),
      dataset,
    );
  }

  itemIconUrl(id: number, dataset: ActiveDatasetSummary | null | undefined): string | null {
    return dataset?.checksum
      ? `${this.baseUrl}/items/${id}/icon?dataset=${dataset.checksum}`
      : null;
  }

  getItems(params: CatalogSearchParams) {
    let httpParams = new HttpParams()
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale())
      .set('page', String(params.page))
      .set('pageSize', String(params.pageSize));
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.ids?.length) httpParams = httpParams.set('ids', params.ids.join(','));
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.grade) httpParams = httpParams.set('grade', params.grade);
    if (params.scope) httpParams = httpParams.set('scope', params.scope);
    return this.cachedPublicRead(
      '/items',
      httpParams,
      () => this.http.get<CatalogPage>(`${this.baseUrl}/items`, { params: httpParams }),
      (page) => page.dataset,
    ).pipe(tap((page) => this.rememberItemIcons(page.items, page.dataset)));
  }

  getItemsByIds(itemIds: readonly number[], expectedDatasetVersion: string) {
    const uniqueIds = [...new Set(itemIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
    if (!uniqueIds.length) return of({ items: new Map<number, CatalogItem>(), dataset: null });

    const batches = Array.from({ length: Math.ceil(uniqueIds.length / 100) }, (_, index) =>
      uniqueIds.slice(index * 100, (index + 1) * 100),
    );
    return forkJoin(batches.map((ids) => this.getItems({ ids, page: 1, pageSize: 100 }))).pipe(
      map((responses) => {
        if (
          responses.some((response) => response.dataset?.version !== expectedDatasetVersion) ||
          responses.some((response) => response.dataset?.version !== responses[0]?.dataset?.version)
        )
          throw new Error('O catálogo mudou durante a consulta dos ícones dos itens.');
        return {
          items: new Map(
            responses.flatMap((response) => response.items.map((item) => [item.id, item] as const)),
          ),
          dataset: responses[0]?.dataset ?? null,
        };
      }),
    );
  }

  getCategories(scope?: 'life-skill') {
    let params = new HttpParams()
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale());
    if (scope) params = params.set('scope', scope);
    return this.cachedPublicRead(
      '/categories',
      params,
      () => this.http.get<CatalogCategoriesResponse>(`${this.baseUrl}/categories`, { params }),
      (response) => response.dataset,
    );
  }

  getItem(id: number) {
    const params = new HttpParams()
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale());
    return this.cachedPublicRead(
      `/items/${id}`,
      params,
      () => this.http.get<CatalogItemResponse>(`${this.baseUrl}/items/${id}`, { params }),
      (response) => response.dataset,
    ).pipe(tap((response) => this.rememberItemIcons([response.item], response.dataset)));
  }

  getItemRecipes(id: number, direction: 'produces' | 'uses') {
    const params = new HttpParams()
      .set('direction', direction)
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale());
    const request = (page: number) =>
      this.http.get<CatalogRecipesResponse>(`${this.baseUrl}/items/${id}/recipes`, {
        params: params.set('page', page).set('pageSize', 100),
      });
    return this.cachedPublicRead(
      `/items/${id}/recipes`,
      params,
      () =>
        request(1).pipe(
          expand((response) => {
            const loaded = (response.page ?? 1) * (response.pageSize ?? 100);
            if (loaded >= response.total) return EMPTY;
            if (!response.page || !response.pageSize || !response.recipes.length)
              throw new Error(
                'Consulta de receitas incompleta. Atualize a API antes de continuar.',
              );
            return request(response.page + 1);
          }, 1),
          reduce((previous: CatalogRecipesResponse | null, response) => {
            if (!previous) return response;
            if (
              previous.dataset?.version !== response.dataset?.version ||
              previous.total !== response.total
            )
              throw new Error('O catálogo mudou durante a consulta de receitas. Tente novamente.');
            return { ...previous, recipes: [...previous.recipes, ...response.recipes] };
          }, null),
          map((response) => {
            if (!response) throw new Error('Consulta de receitas indisponível.');
            const unique = [
              ...new Map(response.recipes.map((recipe) => [recipe.key, recipe])).values(),
            ];
            if (unique.length !== response.total)
              throw new Error('Consulta de receitas incompleta. Tente novamente.');
            return { ...response, recipes: unique };
          }),
        ),
      (response) => response.dataset,
    ).pipe(tap((response) => this.rememberRecipeIcons(response.recipes, response.dataset)));
  }

  getByproductRecipes(
    baseItemIds: readonly number[],
    expectedDatasetVersion: string,
  ): Observable<CatalogRecipesResponse> {
    const uniqueIds = [...new Set(baseItemIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
    if (!uniqueIds.length)
      return of<CatalogRecipesResponse>({
        recipes: [],
        total: 0,
        direction: 'byproducts',
        dataset: null,
      });
    const batches = Array.from({ length: Math.ceil(uniqueIds.length / 100) }, (_, index) =>
      uniqueIds.slice(index * 100, (index + 1) * 100),
    );
    return forkJoin(
      batches.map((ids) =>
        this.http.get<CatalogRecipesResponse>(`${this.baseUrl}/recipes/byproducts`, {
          params: {
            ids: ids.join(','),
            region: this.preferences.region(),
            preferredLocale: preferredDataLocale(),
          },
        }),
      ),
    ).pipe(
      map((responses) => {
        if (responses.some((response) => response.dataset?.version !== expectedDatasetVersion))
          throw new Error('O catálogo mudou durante a consulta dos subprodutos.');
        const byRecipeKey = new Map(
          responses.flatMap((response) =>
            response.recipes.map((recipe) => [recipe.key, recipe] as const),
          ),
        );
        const recipes = [...byRecipeKey.values()].sort((left, right) =>
          left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
        );
        if (responses.some((response) => response.recipes.length !== response.total))
          throw new Error('Consulta de subprodutos incompleta. Atualize e tente novamente.');
        const result = { ...responses[0]!, recipes, total: recipes.length };
        this.rememberRecipeIcons(result.recipes, result.dataset);
        return result;
      }),
    );
  }

  getRecipes(q: string, page: number, recipeGroup?: LifeSkillRecipeGroup, pageSize = 25) {
    let params = new HttpParams()
      .set('q', q)
      .set('page', page)
      .set('pageSize', pageSize)
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale());
    if (recipeGroup) params = params.set('recipeGroup', recipeGroup);
    return this.cachedPublicRead(
      '/recipes',
      params,
      () => this.http.get<RecipeListResponse>(`${this.baseUrl}/recipes`, { params }),
      (response) => response.dataset,
    ).pipe(
      tap((response) =>
        this.rememberItemIcons(
          response.recipes.map((recipe) => ({ id: recipe.itemId, iconUrl: recipe.iconUrl })),
          response.dataset,
        ),
      ),
    );
  }

  getProductionCatalog(region: Region = this.preferences.region()) {
    const params = new HttpParams()
      .set('region', region)
      .set('preferredLocale', preferredDataLocale());
    return this.cachedPublicRead(
      '/production/catalog',
      params,
      () =>
        this.http.get<ProductionCatalogResponse>(`${this.baseUrl}/production/catalog`, { params }),
      (response) => response.dataset,
    ).pipe(
      tap((response) => {
        this.rememberItemIcons(response.items, response.dataset);
        this.rememberRecipeIcons(response.recipes, response.dataset);
      }),
    );
  }

  getRecipe(key: string) {
    const params = new HttpParams()
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale());
    return this.cachedPublicRead(
      `/recipes/${encodeURIComponent(key)}`,
      params,
      () =>
        this.http.get<{ recipe: CatalogRecipe; dataset: ActiveDatasetSummary }>(
          `${this.baseUrl}/recipes/${encodeURIComponent(key)}`,
          { params },
        ),
      (response) => response.dataset,
    ).pipe(tap((response) => this.rememberRecipeIcons([response.recipe], response.dataset)));
  }

  getNpcPurchasePrices(
    itemIds: readonly number[],
    expectedDatasetVersion: string,
    region: Region = this.preferences.region(),
  ) {
    const uniqueIds = [...new Set(itemIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
    if (!uniqueIds.length) return of(new Map<number, NpcPurchasePrice>());

    const batches = Array.from({ length: Math.ceil(uniqueIds.length / 100) }, (_, index) =>
      uniqueIds.slice(index * 100, (index + 1) * 100),
    );
    const requests = batches.map((ids) => {
      const params = new HttpParams()
        .set('ids', ids.join(','))
        .set('region', region)
        .set('preferredLocale', preferredDataLocale());
      return this.cachedPublicRead(
        '/npc-purchase-prices',
        params,
        () =>
          this.http.get<NpcPurchasePricesResponse>(`${this.baseUrl}/npc-purchase-prices`, {
            params,
          }),
        (response) => response.dataset,
      );
    });
    return forkJoin(requests).pipe(
      map((responses) => {
        const versions = responses
          .map((response) => response.dataset?.version)
          .filter((version): version is string => Boolean(version));
        if (
          versions.some((version) => version !== expectedDatasetVersion) ||
          versions.some((version) => version !== versions[0])
        )
          throw new Error('O catálogo mudou durante a consulta dos preços NPC.');
        return new Map(
          responses.flatMap((response) =>
            response.prices.map((price) => [price.itemId, price] as const),
          ),
        );
      }),
    );
  }

  getRecipeMarketEquivalents(
    itemIds: readonly number[],
    expectedDatasetVersion: string,
  ): Observable<RecipeMarketEquivalent[]> {
    const uniqueIds = [...new Set(itemIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
    if (!uniqueIds.length) return of([]);

    const batches = Array.from({ length: Math.ceil(uniqueIds.length / 100) }, (_, index) =>
      uniqueIds.slice(index * 100, (index + 1) * 100),
    );
    return forkJoin(
      batches.map((ids) =>
        this.http.get<RecipeMarketEquivalentsResponse>(
          `${this.baseUrl}/recipe-market-equivalents`,
          {
            params: {
              ids: ids.join(','),
              region: this.preferences.region(),
              preferredLocale: preferredDataLocale(),
            },
          },
        ),
      ),
    ).pipe(
      map((responses) => {
        if (responses.some((response) => response.dataset?.version !== expectedDatasetVersion))
          throw new Error('O catálogo mudou durante a consulta dos equivalentes de mercado.');
        const equivalents = new Map<string, RecipeMarketEquivalent>();
        for (const response of responses)
          for (const equivalent of response.equivalents)
            equivalents.set(`${equivalent.sourceItemId}:${equivalent.itemId}`, equivalent);
        this.rememberItemIcons(
          responses.flatMap((response) =>
            response.equivalents.map((equivalent) => ({
              id: equivalent.itemId,
              iconUrl: equivalent.iconUrl,
            })),
          ),
          responses[0]?.dataset,
        );
        return [...equivalents.values()].sort(
          (left, right) => left.sourceItemId - right.sourceItemId || left.itemId - right.itemId,
        );
      }),
    );
  }
}
