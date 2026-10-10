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
  RecipeListResponse,
} from '@bdo/shared';
import { EMPTY, expand, map, reduce } from 'rxjs';

import { environment } from '../../environments/environment';
import { preferredDataLocale } from './locale';
import { RegionPreferences } from './region-preferences';

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

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly preferences = inject(RegionPreferences);
  private readonly document = inject(DOCUMENT);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  resolveIconUrl(item: Pick<CatalogItem, 'iconUrl'>): string | null {
    return item.iconUrl
      ? new URL(item.iconUrl, environment.apiBaseUrl || this.document.baseURI).href
      : null;
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
    return this.http.get<CatalogPage>(`${this.baseUrl}/items`, { params: httpParams });
  }

  getCategories(scope?: 'life-skill') {
    return this.http.get<CatalogCategoriesResponse>(`${this.baseUrl}/categories`, {
      params: {
        region: this.preferences.region(),
        preferredLocale: preferredDataLocale(),
        ...(scope ? { scope } : {}),
      },
    });
  }

  getItem(id: number) {
    return this.http.get<CatalogItemResponse>(`${this.baseUrl}/items/${id}`, {
      params: { region: this.preferences.region(), preferredLocale: preferredDataLocale() },
    });
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
    return request(1).pipe(
      expand((response) => {
        const loaded = (response.page ?? 1) * (response.pageSize ?? 100);
        if (loaded >= response.total) return EMPTY;
        if (!response.page || !response.pageSize || !response.recipes.length)
          throw new Error('Consulta de receitas incompleta. Atualize a API antes de continuar.');
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
    );
  }

  getRecipes(q: string, page: number, recipeGroup?: LifeSkillRecipeGroup) {
    return this.http.get<RecipeListResponse>(`${this.baseUrl}/recipes`, {
      params: {
        q,
        page,
        pageSize: 24,
        region: this.preferences.region(),
        preferredLocale: preferredDataLocale(),
        ...(recipeGroup ? { recipeGroup } : {}),
      },
    });
  }

  getRecipe(key: string) {
    return this.http.get<{ recipe: CatalogRecipe; dataset: ActiveDatasetSummary }>(
      `${this.baseUrl}/recipes/${encodeURIComponent(key)}`,
      {
        params: { region: this.preferences.region(), preferredLocale: preferredDataLocale() },
      },
    );
  }
}
