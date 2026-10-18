import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  type Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';

import { CatalogApiService } from './catalog-api.service';
import { MarketCacheService } from './market-cache.service';
import { RegionPreferences } from './region-preferences';

export type PublicRouteWarmResult = { status: 'ready' | 'not-found' | 'unavailable' | 'ignored' };

const ignored: PublicRouteWarmResult = { status: 'ignored' };
const notFound: PublicRouteWarmResult = { status: 'not-found' };
const unavailable: PublicRouteWarmResult = { status: 'unavailable' };
const ready: PublicRouteWarmResult = { status: 'ready' };

@Injectable({ providedIn: 'root' })
export class PublicRouteData {
  private readonly catalog = inject(CatalogApiService);
  private readonly marketCache = inject(MarketCacheService);
  private readonly preferences = inject(RegionPreferences);
  private readonly routeLoads = new Map<string, Observable<PublicRouteWarmResult>>();

  /** Warm public catalog/market data; private workspace data never passes through this service. */
  prefetchPath(url: string): Observable<PublicRouteWarmResult> {
    const path = this.normalizedPath(url);
    if (!this.isWarmablePath(path)) return of(ignored);

    let request = this.routeLoads.get(path);
    if (!request) {
      const sharedRequest = this.loadPath(path).pipe(
        catchError((error: unknown) =>
          of(error instanceof HttpErrorResponse && error.status === 404 ? notFound : unavailable),
        ),
        finalize(() => {
          if (this.routeLoads.get(path) === sharedRequest) this.routeLoads.delete(path);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.routeLoads.set(path, sharedRequest);
      request = sharedRequest;
    }
    return request;
  }

  private normalizedPath(url: string): string {
    const path = url.trim().split(/[?#]/, 1)[0] || '/';
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
  }

  private isWarmablePath(path: string): boolean {
    return (
      path === '/market' ||
      path === '/recommendations' ||
      path === '/recipes' ||
      /^\/recipes\/items\/[^/]+$/.test(path) ||
      /^\/recipes\/[^/]+$/.test(path)
    );
  }

  private loadPath(path: string): Observable<PublicRouteWarmResult> {
    if (path === '/recommendations') {
      return this.catalog.getProductionCatalog(this.preferences.region()).pipe(map(() => ready));
    }

    if (path === '/market') {
      const region = this.preferences.region();
      return forkJoin({
        taxonomy: this.catalog.getCategories(),
        board: this.marketCache.resolveBoard({
          region,
          search: '',
          categoryId: '',
          sort: 'hot',
          direction: 'desc',
          stock: 'all',
          page: 1,
          pageSize: 20,
          clientSort: 'hot:desc',
        }),
      }).pipe(map(() => ready));
    }

    if (path === '/recipes') return this.catalog.getRecipes('', 1).pipe(map(() => ready));

    const itemPath = /^\/recipes\/items\/(\d+)$/.exec(path);
    if (itemPath) {
      const itemId = Number(itemPath[1]);
      if (!Number.isSafeInteger(itemId) || itemId < 1 || itemId > 2_147_483_647)
        return of(notFound);
      return this.warmItem(itemId);
    }

    const recipePath = /^\/recipes\/([a-f\d]{64})$/i.exec(path);
    if (recipePath) {
      const recipeKey = recipePath[1];
      return this.catalog.getRecipe(recipeKey).pipe(
        switchMap(({ recipe }) => {
          const product = recipe.outputs[0];
          return product ? this.warmItem(product.itemId) : of(notFound);
        }),
      );
    }

    return of(path.startsWith('/recipes/') ? notFound : ignored);
  }

  private warmItem(itemId: number): Observable<PublicRouteWarmResult> {
    return forkJoin({
      item: this.catalog.getItem(itemId),
      recipes: this.catalog.getItemRecipes(itemId, 'produces'),
    }).pipe(
      map(({ item, recipes }) =>
        item.dataset.version === recipes.dataset?.version ? ready : unavailable,
      ),
    );
  }
}

// Preserve the established import path for callers; route configuration uses the lightweight facade.
export {
  marketRouteResolver,
  recipesRouteResolver,
  recommendationsRouteResolver,
} from './public-route-resolvers';
